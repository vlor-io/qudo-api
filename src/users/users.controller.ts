import { Controller, Get, Patch, Delete, Post, Body, UseGuards, Request, HttpCode, Param, ParseEnumPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { UploadsService } from '@/uploads/uploads.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertChannelDto } from './dto/upsert-channel.dto';
import { PresignAvatarDto } from './dto/presign-avatar.dto';
import { Channel, SocialPlatform } from './entities/channel.entity';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly uploadsService: UploadsService,
  ) {}

  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인된 사용자의 프로필 정보를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiNotFoundError({
    path: '/v1/users/me',
    description: '사용자 레코드 없음 (탈퇴/삭제된 계정 등)',
    message: '사용자를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/users/me')
  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return { success: true, data: user };
  }

  @ApiOperation({
    summary: '프로필 수정',
    description: '표시 이름(displayName) 또는 소개글(bio)을 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiBadRequestError({
    path: '/v1/users/me',
    description: '입력값 오류',
    cases: {
      '이름 길이 미달': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['displayName must be longer than or equal to 2 characters'],
      },
      'Bio 길이 초과': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['bio must be shorter than or equal to 200 characters'],
      },
    },
  })
  @ApiNotFoundError({
    path: '/v1/users/me',
    description: '사용자 레코드 없음',
    message: '사용자를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/users/me')
  @Patch('me')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    return { success: true, data: user };
  }

  @ApiOperation({
    summary: '회원 탈퇴 (영구 삭제)',
    description: '계정과 모든 연관 데이터(워크스페이스/투두/촬영물/캠페인/신청/채널/알림/배지/구독/OAuth 연결)를 즉시 영구 삭제합니다. 복구 불가. provider 측 연결 해제는 best-effort (Kakao 만 실제 unlink 호출, Naver/Google 은 access_token 미보관으로 skip).',
  })
  @ApiResponse({ status: 200, description: '탈뼈 성공 (모든 데이터 영구 삭제됨)' })
  @ApiNotFoundError({
    path: '/v1/users/me',
    description: '사용자 레코드 없음',
    message: '사용자를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/users/me')
  @Delete('me')
  async withdraw(@Request() req: any) {
    await this.authService.withdrawUser(req.user.id);
    return { success: true, data: null };
  }

  @ApiOperation({
    summary: '내 소셜 채널 목록 조회',
    description: '연결된 SNS 채널 목록(Instagram, YouTube 등)을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Channel] })
  @ApiStandardErrors('/v1/users/me/channels')
  @Get('me/channels')
  async getMyChannels(@Request() req: any) {
    const data = await this.usersService.findChannels(req.user.id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '내 활동 통계',
    description: '워크스페이스/촬영물/배지/채널/연결 provider 수를 한 번에 조회. 마이페이지 활동 섹션용.',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    content: {
      'application/json': {
        example: {
          success: true,
          data: {
            totalWorkspaces: 5, totalShots: 124, totalBadges: 3,
            connectedChannels: 2, connectedProviders: 1,
          },
        },
      },
    },
  })
  @ApiStandardErrors('/v1/users/me/stats')
  @Get('me/stats')
  async getMyStats(@Request() req: any) {
    const data = await this.usersService.getStats(req.user.id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '프로필 사진 업로드 티켓 발급',
    description: 'avatar 전용 R2 presigned URL 을 발급합니다. 응답의 uploadUrl 로 PUT 한 뒤 fileUri 를 PATCH /v1/users/me 의 avatarUri 로 보내 저장하세요.',
  })
  @ApiResponse({
    status: 200,
    description: '발급 성공',
    content: {
      'application/json': {
        example: {
          success: true,
          data: {
            uploadUrl: 'https://...presigned...',
            fileUri: 'https://cdn.qudo.app/{userId}/avatar/...',
            objectKey: '{userId}/avatar/...',
          },
        },
      },
    },
  })
  @ApiBadRequestError({
    path: '/v1/users/me/avatar',
    description: '입력값 오류',
    validationDetails: ['fileName should not be empty', 'contentType should not be empty'],
  })
  @ApiStandardErrors('/v1/users/me/avatar')
  @Post('me/avatar')
  @HttpCode(200)
  async presignAvatar(@Request() req: any, @Body() dto: PresignAvatarDto) {
    const data = await this.uploadsService.getAvatarPresignedUrl({
      userId: req.user.id,
      fileName: dto.fileName,
      contentType: dto.contentType,
    });
    return { success: true, data };
  }

  @ApiOperation({
    summary: '소셜 채널 연결/수정',
    description: '특정 플랫폼의 채널을 연결하거나 기존 정보를 업데이트합니다 (Upsert).',
  })
  @ApiResponse({ status: 200, description: '처리 성공', type: Channel })
  @ApiBadRequestError({
    path: '/v1/users/me/channels',
    description: '입력값 오류',
    cases: {
      '지원하지 않는 플랫폼': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['platform must be one of: INSTAGRAM, YOUTUBE, TIKTOK'],
      },
      'URL 형식 오류': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['url must be a URL address'],
      },
      '필수값 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['handle should not be empty'],
      },
    },
  })
  @ApiStandardErrors('/v1/users/me/channels')
  @Post('me/channels')
  @HttpCode(200)
  async upsertChannel(@Request() req: any, @Body() dto: UpsertChannelDto) {
    const data = await this.usersService.upsertChannel(req.user.id, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '소셜 채널 연결 해제',
    description: '특정 플랫폼의 채널 연결을 해제합니다.',
  })
  @ApiParam({ name: 'platform', enum: SocialPlatform })
  @ApiResponse({ status: 200, description: '해제 성공' })
  @ApiNotFoundError({
    path: '/v1/users/me/channels/{platform}',
    description: '연결된 채널이 없음',
    message: '해당 플랫폼 채널 연결을 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/users/me/channels/{platform}')
  @Delete('me/channels/:platform')
  @HttpCode(200)
  async deleteChannel(
    @Request() req: any,
    @Param('platform', new ParseEnumPipe(SocialPlatform)) platform: SocialPlatform,
  ) {
    await this.usersService.deleteChannel(req.user.id, platform);
    return { success: true, data: null };
  }
}
