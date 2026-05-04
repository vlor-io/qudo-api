import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

interface KakaoIdTokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  nickname?: string;
  picture?: string;
}

@Injectable()
export class KakaoVerifier implements OAuthVerifier {
  private readonly jwks = createRemoteJWKSet(new URL('https://kauth.kakao.com/.well-known/jwks.json'));

  constructor(private readonly config: ConfigService) {}

  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    if (!input.idToken) {
      throw new BadRequestException('Kakao 로그인은 idToken (OIDC) 이 필요합니다. SDK 호출 시 scopes 에 openid 포함 필수.');
    }
    const audience = this.config.get<string>('KAKAO_CLIENT_ID');
    if (!audience) {
      throw new ServiceUnavailableException('KAKAO_CLIENT_ID 환경설정이 누락되었습니다.');
    }

    let payload: KakaoIdTokenPayload;
    try {
      const result = await jwtVerify(input.idToken, this.jwks, {
        issuer: 'https://kauth.kakao.com',
        audience,
      });
      payload = result.payload as KakaoIdTokenPayload;
    } catch {
      throw new UnauthorizedException('Kakao id_token 검증에 실패했습니다.');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Kakao id_token 에 sub 가 없습니다.');
    }

    return {
      providerId: payload.sub,
      email: payload.email,
      displayName: payload.nickname,
      avatarUri: payload.picture,
    };
  }

  /**
   * Kakao Admin Key 로 사용자 연결 해제.
   * https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#unlink-admin
   */
  async revoke(providerId: string): Promise<void> {
    const adminKey = this.config.get<string>('KAKAO_ADMIN_KEY');
    if (!adminKey) {
      console.warn('[KakaoVerifier] KAKAO_ADMIN_KEY 미설정 — unlink skip');
      return;
    }
    try {
      await axios.post(
        'https://kapi.kakao.com/v1/user/unlink',
        new URLSearchParams({ target_id_type: 'user_id', target_id: providerId }).toString(),
        {
          headers: {
            Authorization: `KakaoAK ${adminKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        },
      );
    } catch (e) {
      if (axios.isAxiosError(e)) {
        throw new Error(`Kakao unlink failed: status=${e.response?.status} body=${JSON.stringify(e.response?.data)}`);
      }
      throw e;
    }
  }
}
