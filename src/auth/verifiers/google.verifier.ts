import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OAuthVerifier } from './oauth-verifier.interface';
import { OAuthProfile } from '@/users/users.service';

@Injectable()
export class GoogleVerifier implements OAuthVerifier {
  constructor(private readonly config: ConfigService) {}

  async verify(input: { accessToken?: string; idToken?: string }): Promise<OAuthProfile> {
    const idToken = input.idToken ?? input.accessToken;
    if (!idToken) {
      throw new BadRequestException('Google 로그인은 idToken (또는 accessToken) 이 필요합니다.');
    }

    const allowedAuds = (this.config.get<string>('GOOGLE_CLIENT_IDS') ?? this.config.get<string>('GOOGLE_CLIENT_ID') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowedAuds.length === 0) {
      throw new ServiceUnavailableException('Google client_id 환경설정이 누락되었습니다.');
    }

    let data: any;
    try {
      const res = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: idToken },
        timeout: 5000,
      });
      data = res.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        throw new UnauthorizedException('Google id_token 이 유효하지 않습니다.');
      }
      throw new ServiceUnavailableException('Google 인증 서버 호출에 실패했습니다.');
    }

    if (!allowedAuds.includes(data.aud)) {
      throw new UnauthorizedException('Google client_id (aud) 가 허용 목록에 없습니다.');
    }
    const issuer = data.iss;
    if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
      throw new UnauthorizedException('Google issuer 가 유효하지 않습니다.');
    }

    return {
      providerId: data.sub,
      email: data.email_verified === 'true' || data.email_verified === true ? data.email : undefined,
      displayName: data.name,
      avatarUri: data.picture,
    };
  }
}
