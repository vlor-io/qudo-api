import { Body, Controller, Delete, Get, HttpCode, Param, ParseEnumPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OAuthProvider } from '@/users/entities/oauth-identity.entity';
import {
  ApiBadRequestError,
  ApiConflictError,
  ApiInternalError,
  ApiStandardErrors,
} from '@/common/decorators/api-standard-errors.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';

const ERROR_SCHEMA_REF = { $ref: getSchemaPath(ErrorResponseDto) };

@ApiTags('Auth (인증)')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '소셜 로그인 / 회원가입',
    description: '모바일 SDK 가 발급한 access/id token 을 백엔드에서 provider 서버로 검증한 뒤 JWT 를 발급합니다. 신규 사용자는 자동 가입됩니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiBadRequestError({
    path: '/v1/auth/social',
    description: '입력값 오류 또는 토큰 종류 누락',
    cases: {
      'provider 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['provider must be one of the following values: kakao, naver, google, apple'],
      },
      'Apple idToken 누락': {
        code: 'BAD_REQUEST',
        message: 'Apple 로그인은 idToken 이 필요합니다.',
      },
      'Kakao accessToken 누락': {
        code: 'BAD_REQUEST',
        message: '카카오 로그인은 accessToken 이 필요합니다.',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '소셜 토큰 검증 실패',
    content: {
      'application/json': {
        schema: ERROR_SCHEMA_REF,
        example: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: '카카오 토큰이 유효하지 않습니다.', details: null },
          timestamp: '2026-04-19T02:00:00.000Z',
          path: '/v1/auth/social',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'provider 인증 서버 호출 실패',
    content: {
      'application/json': {
        schema: ERROR_SCHEMA_REF,
        example: {
          success: false,
          error: { code: 'SERVER_ERROR', message: '카카오 인증 서버 호출에 실패했습니다.', details: null },
          timestamp: '2026-04-19T02:00:00.000Z',
          path: '/v1/auth/social',
        },
      },
    },
  })
  @ApiInternalError({ path: '/v1/auth/social' })
  @Post('social')
  @HttpCode(200)
  async socialLogin(@Body() dto: SocialLoginDto) {
    const data = await this.authService.socialLogin(dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '소셜 계정 추가 연결',
    description: '로그인된 사용자에게 다른 provider 계정을 연결합니다 (예: 카카오로 가입한 user 가 구글 추가 연결).',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '연결 성공. 연결된 provider 목록 반환' })
  @ApiConflictError({
    path: '/v1/auth/social/link',
    description: '이미 다른 user 에 연결된 소셜 계정',
    message: '이미 다른 계정에 연결된 소셜 계정입니다.',
  })
  @ApiStandardErrors('/v1/auth/social/link')
  @UseGuards(JwtAuthGuard)
  @Post('social/link')
  @HttpCode(200)
  async socialLink(@Request() req: any, @Body() dto: SocialLoginDto) {
    const data = await this.authService.socialLink(req.user.id, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '소셜 계정 연결 해제',
    description: '특정 provider 의 연결을 해제합니다. 마지막 1개 provider 는 해제할 수 없습니다 (계정 잠김 방지).',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'provider', enum: OAuthProvider })
  @ApiResponse({ status: 200, description: '해제 성공. 남은 provider 목록 반환' })
  @ApiBadRequestError({
    path: '/v1/auth/social/{provider}',
    description: '마지막 provider 해제 시도',
    cases: {
      '마지막 연결 수단': {
        code: 'BAD_REQUEST',
        message: '마지막 연결 수단은 해제할 수 없습니다. 먼저 다른 소셜 계정을 연결하세요.',
      },
    },
  })
  @ApiStandardErrors('/v1/auth/social/{provider}')
  @UseGuards(JwtAuthGuard)
  @Delete('social/:provider')
  async socialUnlink(
    @Request() req: any,
    @Param('provider', new ParseEnumPipe(OAuthProvider)) provider: OAuthProvider,
  ) {
    const data = await this.authService.socialUnlink(req.user.id, provider);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '연결된 소셜 계정 목록',
    description: '현재 사용자에게 연결된 OAuth provider 목록을 반환합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiStandardErrors('/v1/auth/social/providers')
  @UseGuards(JwtAuthGuard)
  @Get('social/providers')
  async listProviders(@Request() req: any) {
    const data = await this.authService.listProviders(req.user.id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: 'Access Token 갱신',
    description: 'Refresh Token 으로 만료된 Access Token 을 재발급합니다.',
  })
  @ApiResponse({ status: 200, description: '갱신 성공' })
  @ApiBadRequestError({
    path: '/v1/auth/refresh',
    description: 'refreshToken 필드 누락',
    validationDetails: ['refreshToken should not be empty'],
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh Token 오류',
    content: {
      'application/json': {
        schema: ERROR_SCHEMA_REF,
        examples: {
          '리프레시 토큰 만료': {
            value: {
              success: false,
              error: { code: 'TOKEN_EXPIRED', message: '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.', details: null },
              timestamp: '2026-04-19T02:00:00.000Z',
              path: '/v1/auth/refresh',
            },
          },
          '유효하지 않은 리프레시 토큰': {
            value: {
              success: false,
              error: { code: 'INVALID_TOKEN', message: '유효하지 않은 리프레시 토큰입니다.', details: null },
              timestamp: '2026-04-19T02:00:00.000Z',
              path: '/v1/auth/refresh',
            },
          },
        },
      },
    },
  })
  @ApiInternalError({ path: '/v1/auth/refresh' })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refreshToken(dto.refreshToken);
    return { success: true, data };
  }

  @ApiOperation({ summary: '로그아웃', description: '현재 세션의 토큰을 무효화합니다.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  @ApiStandardErrors('/v1/auth/logout')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout() {
    return { success: true, data: null };
  }
}
