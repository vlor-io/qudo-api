import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // info에 담긴 JWT 에러 종류에 따라 정확한 메시지 분기
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: '인증 토큰이 만료되었습니다.',
        });
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다.',
        });
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException({
          code: 'INVALID_TOKEN',
          message: '아직 활성화되지 않은 토큰입니다.',
        });
      }

      // Authorization 헤더 자체가 없는 경우
      if (!info || info?.message === 'No auth token') {
        throw new UnauthorizedException({
          code: 'MISSING_TOKEN',
          message: 'Authorization 헤더가 누락되었습니다.',
        });
      }

      throw err || new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '인증에 실패했습니다.',
      });
    }

    return user;
  }
}
