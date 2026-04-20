import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();

      // Guard 등에서 { code, message } 객체로 던진 경우 → 우선 적용
      if (res?.code && res?.message) {
        code = res.code;
        message = res.message;
      }
      // class-validator 등의 배열 에러인 경우
      else if (Array.isArray(res?.message)) {
        code = this.getErrorCode(status);
        message = 'Validation Failed';
        details = res.message;
      }
      // 그 외 일반 문자열 메시지
      else {
        code = this.getErrorCode(status);
        message = typeof res === 'string' ? res : res?.message || message;
      }
    } else {
      console.error('[Unhandled Exception]', exception);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'TOO_MANY_REQUESTS';
      default: return 'SERVER_ERROR';
    }
  }
}
