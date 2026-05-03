import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

@Injectable()
export class KakaoVerifier implements OAuthVerifier {
  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    if (!input.accessToken) {
      throw new BadRequestException('카카오 로그인은 accessToken 이 필요합니다.');
    }
    try {
      const { data } = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${input.accessToken}` },
        timeout: 5000,
      });
      const account = data.kakao_account ?? {};
      const profile = data.properties ?? {};
      return {
        providerId: String(data.id),
        email: account.email,
        displayName: profile.nickname ?? account.profile?.nickname,
        avatarUri: profile.profile_image ?? account.profile?.profile_image_url,
      };
    } catch (e) {
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        throw new UnauthorizedException('카카오 토큰이 유효하지 않습니다.');
      }
      throw new ServiceUnavailableException('카카오 인증 서버 호출에 실패했습니다.');
    }
  }
}
