import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole, UserPlan } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { UpsertChannelDto } from './dto/upsert-channel.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {}

  /**
   * 전역 고유 워크스페이스 키 생성 (YYMMDDHHMMSSms + Random)
   */
  private generateWorkspaceKey(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-T:.Z]/g, '') // 모든 구분자 제거
      .slice(2, 17); // YYMMDDHHMMSSms 형식 추출
    
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}_${random}`;
  }

  async findByProviderId(providerId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { providerId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    // 비밀번호 비교를 위해 select: false인 passwordHash를 포함해서 가져와야 할 때가 있음
    // 하지만 기본 조회에서는 포함하지 않음. 필요한 경우 별도 쿼리 사용.
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createUser(providerId: string, displayName?: string, email?: string): Promise<User> {
    // 기초 랜덤 이름 생성 (이름이 안 넘어왔을 때)
    const fallbackName = displayName || `User_${Math.floor(Math.random() * 10000)}`;
    const user = this.userRepository.create({
      providerId,
      displayName: fallbackName,
      email,
      workspaceKey: this.generateWorkspaceKey(),
      role: UserRole.CREATOR,
      plan: UserPlan.FREE,
    });
    return this.userRepository.save(user);
  }

  async createEmailUser(email: string, passwordHash: string, displayName: string): Promise<User> {
    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName,
      workspaceKey: this.generateWorkspaceKey(),
      role: UserRole.CREATOR,
      plan: UserPlan.FREE,
    });
    return this.userRepository.save(user);
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
