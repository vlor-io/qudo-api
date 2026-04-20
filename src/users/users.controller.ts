import { Controller, Get, Patch, Delete, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertChannelDto } from './dto/upsert-channel.dto';
import { Channel } from './entities/channel.entity';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Users (사용자)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    summary: '회원 탈퇴',
    description: '계정을 소프트 삭제 처리합니다. 30일 이내 복구 가능합니다.',
  })
  @ApiResponse({ status: 200, description: '탈퇴 성공' })
  @ApiNotFoundError({
    path: '/v1/users/me',
    description: '사용자 레코드 없음',
    message: '사용자를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/users/me')
  @Delete('me')
  async withdraw(@Request() req: any) {
    await this.usersService.softDeleteUser(req.user.id);
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
}
