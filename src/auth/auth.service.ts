import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile, UsersService } from '@/users/users.service';
import { OAuthProvider } from '@/users/entities/oauth-identity.entity';
import { User } from '@/users/entities/user.entity';
import { SocialLoginDto } from './dto/social-login.dto';
import { KakaoVerifier } from './verifiers/kakao.verifier';
import { NaverVerifier } from './verifiers/naver.verifier';
import { GoogleVerifier } from './verifiers/google.verifier';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly kakaoVerifier: KakaoVerifier,
    private readonly naverVerifier: NaverVerifier,
    private readonly googleVerifier: GoogleVerifier,
  ) {}

  async socialLogin(dto: SocialLoginDto) {
    const profile = await this.verifyProviderToken(dto);
    if (dto.displayNameHint && !profile.displayName) {
      profile.displayName = dto.displayNameHint;
    }

    let user = await this.usersService.findByOAuth(dto.provider, profile.providerId);
    let isNewUser = false;
    if (!user) {
      user = await this.usersService.createUserWithOAuth(dto.provider, profile);
      isNewUser = true;
    } else {
      await this.usersService.refreshIdentitySnapshotIfMissing(user.id, dto.provider, profile);
    }
    return this.generateTokens(user, isNewUser);
  }

  async socialLink(userId: string, dto: SocialLoginDto) {
    const profile = await this.verifyProviderToken(dto);
    if (dto.displayNameHint && !profile.displayName) {
      profile.displayName = dto.displayNameHint;
    }
    await this.usersService.linkProvider(userId, dto.provider, profile);
    return this.usersService.listProvidersOfUser(userId);
  }

  async socialUnlink(userId: string, provider: OAuthProvider) {
    await this.usersService.unlinkProvider(userId, provider);
    return this.usersService.listProvidersOfUser(userId);
  }

  listProviders(userId: string) {
    return this.usersService.listProvidersOfUser(userId);
  }

  /**
   * 회원탈뼈 — 모든 OAuthIdentity 의 provider 측 unlink 를 best-effort 시도 후 user 영구 삭제.
   * DB CASCADE 가 모든 child 정리.
   */
  async withdrawUser(userId: string): Promise<void> {
    const identities = await this.usersService.listProvidersOfUser(userId);

    await Promise.allSettled(
      identities.map(async (i) => {
        try {
          switch (i.provider) {
            case OAuthProvider.KAKAO:
              await this.kakaoVerifier.revoke(i.providerId);
              break;
            case OAuthProvider.NAVER:
              await this.naverVerifier.revoke(i.providerId);
              break;
            case OAuthProvider.GOOGLE:
              await this.googleVerifier.revoke(i.providerId);
              break;
          }
        } catch (err) {
          console.error(`[withdrawUser] ${i.provider} revoke failed for ${i.providerId}:`, err);
        }
      }),
    );

    await this.usersService.hardDeleteUser(userId);
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const decoded = this.jwtService.verify(oldRefreshToken);
      const payload = { sub: decoded.sub, role: decoded.role };

      const accessTokenTtl = this.configService.get<number>('JWT_ACCESS_TTL') || 3600;
      const accessToken = this.jwtService.sign(payload, { expiresIn: `${accessTokenTtl}s` });

      return {
        accessToken,
        expiresIn: accessTokenTtl,
      };
    } catch (error) {
      throw new UnauthorizedException('만료되거나 유효하지 않은 Refresh Token입니다.');
    }
  }

  private verifyProviderToken(dto: SocialLoginDto): Promise<OAuthProfile> {
    const input = { accessToken: dto.accessToken, idToken: dto.idToken };
    switch (dto.provider) {
      case OAuthProvider.KAKAO:
        return this.kakaoVerifier.verify(input);
      case OAuthProvider.NAVER:
        return this.naverVerifier.verify(input);
      case OAuthProvider.GOOGLE:
        return this.googleVerifier.verify(input);
      default:
        throw new BadRequestException('지원하지 않는 소셜 로그인 공급자입니다.');
    }
  }

  private async generateTokens(user: User, isNewUser: boolean) {
    const payload = { sub: user.id, role: user.role };

    const accessTokenTtl = this.configService.get<number>('JWT_ACCESS_TTL') || 3600;
    const refreshTokenTtl = this.configService.get<number>('JWT_REFRESH_TTL') || 2592000;

    const accessToken = this.jwtService.sign(payload, { expiresIn: `${accessTokenTtl}s` });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: `${refreshTokenTtl}s` });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenTtl,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUri: user.avatarUri,
        plan: user.plan,
        role: user.role,
      },
      isNewUser,
    };
  }
}
