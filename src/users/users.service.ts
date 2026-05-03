import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole, UserPlan } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { OAuthIdentity, OAuthProvider } from './entities/oauth-identity.entity';
import { UpsertChannelDto } from './dto/upsert-channel.dto';

export interface OAuthProfile {
  providerId: string;
  email?: string;
  displayName?: string;
  avatarUri?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(OAuthIdentity)
    private readonly oauthRepository: Repository<OAuthIdentity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByOAuth(provider: OAuthProvider, providerId: string): Promise<User | null> {
    const identity = await this.oauthRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });
    if (!identity) return null;
    // touch lastLoginAt (best-effort)
    await this.oauthRepository.update(identity.id, { lastLoginAt: new Date() });
    return identity.user;
  }

  /**
   * 신규 user + 첫 OAuthIdentity 트랜잭션 생성.
   * (provider, providerId) 충돌 시 ConflictException 변환.
   */
  async createUserWithOAuth(provider: OAuthProvider, profile: OAuthProfile): Promise<User> {
    const fallbackName = profile.displayName || `User_${Math.floor(Math.random() * 10000)}`;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = manager.create(User, {
          displayName: fallbackName,
          email: profile.email,
          avatarUri: profile.avatarUri,
          role: UserRole.CREATOR,
          plan: UserPlan.FREE,
        });
        const savedUser = await manager.save(user);

        const identity = manager.create(OAuthIdentity, {
          userId: savedUser.id,
          provider,
          providerId: profile.providerId,
          email: profile.email,
          displayName: profile.displayName,
          avatarUri: profile.avatarUri,
          lastLoginAt: new Date(),
        });
        await manager.save(identity);

        return savedUser;
      });
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException('이미 가입된 소셜 계정입니다.');
      }
      throw e;
    }
  }

  /**
   * 이미 로그인된 user 에 새 provider 연결.
   * (provider, providerId) 가 다른 user 에 묶여 있으면 ConflictException.
   */
  async linkProvider(userId: string, provider: OAuthProvider, profile: OAuthProfile): Promise<OAuthIdentity> {
    const existing = await this.oauthRepository.findOne({
      where: { provider, providerId: profile.providerId },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException('이미 다른 계정에 연결된 소셜 계정입니다.');
    }
    if (existing && existing.userId === userId) {
      // 동일 user 의 동일 provider — 멱등 처리 + 스냅샷 갱신
      await this.oauthRepository.update(existing.id, {
        email: profile.email ?? existing.email,
        displayName: profile.displayName ?? existing.displayName,
        avatarUri: profile.avatarUri ?? existing.avatarUri,
        lastLoginAt: new Date(),
      });
      return this.oauthRepository.findOneBy({ id: existing.id });
    }

    // 동일 user 가 같은 provider 의 다른 계정으로 link 시도 — 정책상 거부
    const sameProviderForUser = await this.oauthRepository.findOne({
      where: { userId, provider },
    });
    if (sameProviderForUser) {
      throw new ConflictException(`이미 ${provider} 계정이 연결되어 있습니다. 먼저 해제 후 다시 시도하세요.`);
    }

    const identity = this.oauthRepository.create({
      userId,
      provider,
      providerId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUri: profile.avatarUri,
      lastLoginAt: new Date(),
    });
    return this.oauthRepository.save(identity);
  }

  /**
   * provider 연결 해제. 마지막 1개는 거부.
   */
  async unlinkProvider(userId: string, provider: OAuthProvider): Promise<void> {
    const identities = await this.oauthRepository.find({ where: { userId } });
    if (identities.length === 0) {
      throw new NotFoundException('연결된 소셜 계정이 없습니다.');
    }
    if (identities.length === 1) {
      throw new BadRequestException('마지막 연결 수단은 해제할 수 없습니다. 먼저 다른 소셜 계정을 연결하세요.');
    }
    const target = identities.find((i) => i.provider === provider);
    if (!target) {
      throw new NotFoundException(`${provider} 계정 연결을 찾을 수 없습니다.`);
    }
    await this.oauthRepository.delete(target.id);
  }

  async listProvidersOfUser(userId: string): Promise<OAuthIdentity[]> {
    return this.oauthRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 재로그인 시 provider 가 새로 준 정보가 있고, 기존 OAuthIdentity 의 해당 필드가 비어있으면 보강 저장.
   * Apple 의 경우 첫 로그인에만 email/name 이 오므로 중요.
   */
  async refreshIdentitySnapshotIfMissing(
    userId: string,
    provider: OAuthProvider,
    profile: OAuthProfile,
  ): Promise<void> {
    const identity = await this.oauthRepository.findOne({
      where: { userId, provider, providerId: profile.providerId },
    });
    if (!identity) return;

    const patch: Partial<OAuthIdentity> = { lastLoginAt: new Date() };
    if (!identity.email && profile.email) patch.email = profile.email;
    if (!identity.displayName && profile.displayName) patch.displayName = profile.displayName;
    if (!identity.avatarUri && profile.avatarUri) patch.avatarUri = profile.avatarUri;

    await this.oauthRepository.update(identity.id, patch);

    // user 의 표시 정보도 비어있으면 보강
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;
    const userPatch: Partial<User> = {};
    if (!user.email && profile.email) userPatch.email = profile.email;
    if (!user.avatarUri && profile.avatarUri) userPatch.avatarUri = profile.avatarUri;
    if (Object.keys(userPatch).length > 0) {
      await this.userRepository.update(userId, userPatch);
    }
  }

  async updateProfile(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }

  async findChannels(userId: string): Promise<Channel[]> {
    return this.channelRepository.find({
      where: { userId },
      order: { followers: 'DESC' },
    });
  }

  async upsertChannel(userId: string, dto: UpsertChannelDto): Promise<Channel> {
    const existing = await this.channelRepository.findOne({
      where: { userId, platform: dto.platform },
    });

    if (existing) {
      await this.channelRepository.update(existing.id, {
        handle: dto.handle,
        followers: dto.followers,
      });
      return this.channelRepository.findOneBy({ id: existing.id });
    }

    const channel = this.channelRepository.create({
      userId,
      ...dto,
    });
    return this.channelRepository.save(channel);
  }
}
