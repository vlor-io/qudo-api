import { OAuthProfile } from '@/users/users.service';

export interface OAuthVerifier {
  /**
   * provider 가 발급한 토큰을 검증하고 사용자 프로필을 반환한다.
   * 검증 실패 시 UnauthorizedException, 외부 호출 실패 시 ServiceUnavailableException 을 던진다.
   */
  verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile>;
}
