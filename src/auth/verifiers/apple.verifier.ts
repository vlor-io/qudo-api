import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

@Injectable()
export class AppleVerifier implements OAuthVerifier {
  private readonly jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

  constructor(private readonly config: ConfigService) {}

  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    if (!input.idToken) {
      throw new BadRequestException('Apple 로그인은 idToken 이 필요합니다.');
    }
    const audience = this.config.get<string>('APPLE_BUNDLE_ID');
    const issuer = this.config.get<string>('APPLE_ISSUER') ?? 'https://appleid.apple.com';
    if (!audience) {
      throw new ServiceUnavailableException('Apple bundle id 환경설정이 누락되었습니다.');
    }

    let payload: JWTPayload & { email?: string };
    try {
      const result = await jwtVerify(input.idToken, this.jwks, { issuer, audience });
      payload = result.payload as JWTPayload & { email?: string };
    } catch {
      throw new UnauthorizedException('Apple identity_token 검증에 실패했습니다.');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Apple identity_token 에 sub 가 없습니다.');
    }

    return {
      providerId: payload.sub,
      email: payload.email,
      displayName: undefined,
      avatarUri: undefined,
    };
  }
}
