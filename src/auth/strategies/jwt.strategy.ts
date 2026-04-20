import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Bearer {token} 에서 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // .env에서 JWT_ACCESS_SECRET을 읽음. 없으면 기본값(테스트용)
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback_secret_key_123',
    });
  }

  // AuthGuard 통과 시 request.user 에 이 반환값이 담깁니다.
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, role: payload.role };
  }
}
