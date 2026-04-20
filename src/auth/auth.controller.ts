import { Controller, Post, Body, HttpCode, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiConflictError,
  ApiInternalError,
} from '@/common/decorators/api-standard-errors.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';

const ERROR_SCHEMA_REF = { $ref: getSchemaPath(ErrorResponseDto) };

@ApiTags('Auth (인증)')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '이메일 회원가입',
    description: '이메일과 비밀번호로 신규 계정을 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiBadRequestError({
    path: '/v1/auth/register',
    description: '입력값 형식 오류',
    cases: {
      '이메일 형식 오류': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['email must be an email'],
      },
      '비밀번호 길이 부족': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['password must be longer than or equal to 8 characters'],
      },
      '필수값 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['displayName should not be empty'],
      },
    },
  })
  @ApiConflictError({
    path: '/v1/auth/register',
    description: '이미 가입된 이메일',
    message: '이미 사용 중인 이메일 주소입니다.',
  })
  @ApiInternalError({ path: '/v1/auth/register' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '이메일 로그인',
    description: '이메일과 비밀번호로 로그인하여 Access/Refresh 토큰을 발급받습니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiBadRequestError({
    path: '/v1/auth/login',
    description: '입력값 누락',
    cases: {
      '이메일 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['email should not be empty'],
      },
      '비밀번호 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['password should not be empty'],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '이메일 또는 비밀번호 불일치',
    content: {
      'application/json': {
        schema: ERROR_SCHEMA_REF,
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '이메일 또는 비밀번호가 일치하지 않습니다.',
            details: null,
          },
          timestamp: '2026-04-19T02:00:00.000Z',
          path: '/v1/auth/login',
        },
      },
    },
  })
  @ApiInternalError({ path: '/v1/auth/login' })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '소셜 로그인 / 회원가입',
    description: '소셜 공급자(kakao, google 등)의 토큰으로 로그인 또는 자동 회원가입합니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiBadRequestError({
    path: '/v1/auth/social',
    description: '지원하지 않는 소셜 공급자 또는 입력값 오류',
    cases: {
      '지원하지 않는 공급자': {
        code: 'BAD_REQUEST',
        message: '지원하지 않는 소셜 로그인 공급자입니다.',
      },
      'DTO 검증 실패': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['provider should not be empty', 'accessToken should not be empty'],
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
          error: {
            code: 'UNAUTHORIZED',
            message: '소셜 인증 토큰이 유효하지 않습니다.',
            details: null,
          },
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
    summary: 'Access Token 갱신',
    description: 'Refresh Token으로 만료된 Access Token을 재발급합니다.',
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
              error: {
                code: 'TOKEN_EXPIRED',
                message: '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.',
                details: null,
              },
              timestamp: '2026-04-19T02:00:00.000Z',
              path: '/v1/auth/refresh',
            },
          },
          '유효하지 않은 리프레시 토큰': {
            value: {
              success: false,
              error: {
                code: 'INVALID_TOKEN',
                message: '유효하지 않은 리프레시 토큰입니다.',
                details: null,
              },
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
