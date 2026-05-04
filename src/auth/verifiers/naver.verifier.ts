import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

@Injectable()
export class NaverVerifier implements OAuthVerifier {
  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    if (!input.accessToken) {
      throw new BadRequestException('네이버 로그인은 accessToken 이 필요합니다.');
    }
    try {
      const { data } = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${input.accessToken}` },
        timeout: 5000,
      });
      if (data.resultcode !== '00') {
        throw new UnauthorizedException('네이버 토큰 검증에 실패했습니다.');
      }
      const r = data.response ?? {};
      return {
        providerId: r.id,
        email: r.email,
        displayName: r.nickname ?? r.name,
        avatarUri: r.profile_image,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        throw new UnauthorizedException('네이버 토큰이 유효하지 않습니다.');
      }
      throw new ServiceUnavailableException('네이버 인증 서버 호출에 실패했습니다.');
    }
  }

  /**
   * Naver revoke 는 access_token + client_secret 필요. 본 설계는 access_token 영구 보관 X → noop + log.
   */
  async revoke(providerId: string): Promise<void> {
    console.warn(`[NaverVerifier] revoke skipped (no access_token stored). providerId=${providerId}`);
  }
}
