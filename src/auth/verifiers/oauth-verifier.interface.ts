import { OAuthProfile } from '@/users/users.service';

export interface OAuthVerifier {
  /**
   * provider 가 발급한 토큰을 검증하고 사용자 프로필을 반환.
   * 검증 실패 시 UnauthorizedException, 외부 호출 실패 시 ServiceUnavailableException.
   */
  verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile>;

  /**
   * 회원탈뼈 시 provider 측 연결 해제. best-effort — 실패는 호출 측에서 catch.
   * 구현 가능한 provider 만 noop 이 아닌 실 호출 (현재는 Kakao only).
   */
  revoke?(providerId: string): Promise<void>;
}
