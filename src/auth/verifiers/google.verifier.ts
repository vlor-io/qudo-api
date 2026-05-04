import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

interface GoogleIdTokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GoogleVerifier implements OAuthVerifier {
  private readonly jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

  constructor(private readonly config: ConfigService) {}

  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    const idToken = input.idToken ?? input.accessToken;
    if (!idToken) {
      throw new BadRequestException('Google 로그인은 idToken 이 필요합니다.');
    }

    const allowedAuds = (this.config.get<string>('GOOGLE_CLIENT_IDS') ?? this.config.get<string>('GOOGLE_CLIENT_ID') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowedAuds.length === 0) {
      throw new ServiceUnavailableException('Google client_id 환경설정이 누락되었습니다.');
    }

    let payload: GoogleIdTokenPayload;
    try {
      const result = await jwtVerify(idToken, this.jwks, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: allowedAuds,
      });
      payload = result.payload as GoogleIdTokenPayload;
    } catch {
      throw new UnauthorizedException('Google id_token 검증에 실패했습니다 (서명/만료/aud/iss 불일치).');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Google id_token 에 sub 가 없습니다.');
    }

    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return {
      providerId: payload.sub,
      email: emailVerified ? payload.email : undefined,
      displayName: payload.name,
      avatarUri: payload.picture,
    };
  }

  /**
   * Google revoke 는 access_token/refresh_token 영구 보관 필요. 본 설계는 보안 우선으로 보관 X → noop + log.
   */
  async revoke(providerId: string): Promise<void> {
    console.warn(`[GoogleVerifier] revoke skipped (no token stored). providerId=${providerId}`);
  }
}
