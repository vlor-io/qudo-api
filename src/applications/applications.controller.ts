import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Application } from './entities/application.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiConflictError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Applications (캠페인 신청)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @ApiOperation({
    summary: '캠페인 신청하기',
    description: '특정 캠페인에 체험단/광고 신청을 합니다.',
  })
  @ApiResponse({ status: 201, description: '신청 성공', type: Application })
  @ApiBadRequestError({
    path: '/v1/applications/campaign/{campaignId}',
    description: '입력값 오류',
    validationDetails: ['note must be a string'],
  })
  @ApiNotFoundError({
    path: '/v1/applications/campaign/{campaignId}',
    description: '캠페인이 존재하지 않음',
    message: '해당 캠페인을 찾을 수 없습니다.',
  })
  @ApiConflictError({
    path: '/v1/applications/campaign/{campaignId}',
    description: '이미 신청한 캠페인',
    message: '이미 신청한 캠페인입니다.',
  })
  @ApiStandardErrors('/v1/applications/campaign/{campaignId}')
  @Post('campaign/:campaignId')
  async apply(
    @Request() req: any,
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    const data = await this.applicationsService.apply(req.user.id, campaignId, dto);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '내 신청 목록 조회',
    description: '로그인된 사용자가 신청한 모든 캠페인 목록을 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Application] })
  @ApiStandardErrors('/v1/applications/me')
  @Get('me')
  async findMyApplications(@Request() req: any) {
    const data = await this.applicationsService.findMyApplications(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '캠페인별 신청자 목록 조회 (광고주 전용)',
    description: '특정 캠페인에 신청한 모든 사용자 목록을 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Application] })
  @ApiForbiddenError({
    path: '/v1/applications/campaign/{campaignId}/applicants',
    description: '본인 캠페인이 아님',
    message: '본인의 캠페인 신청자만 조회할 수 있습니다.',
  })
  @ApiNotFoundError({
    path: '/v1/applications/campaign/{campaignId}/applicants',
    description: '캠페인이 존재하지 않음',
    message: '해당 캠페인을 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/applications/campaign/{campaignId}/applicants')
  @Get('campaign/:campaignId/applicants')
  async findApplicants(@Request() req: any, @Param('campaignId') campaignId: string) {
    const data = await this.applicationsService.findApplicantsByCampaign(req.user.id, campaignId);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '신청자 선정 (광고주 전용)',
    description: '특정 신청자를 캠페인 참가자로 선정합니다. 선정 시 해당 사용자의 워크스페이스가 자동 생성됩니다.',
  })
  @ApiResponse({ status: 200, description: '선정 성공', type: Application })
  @ApiForbiddenError({
    path: '/v1/applications/{id}/select',
    description: '본인 캠페인이 아님',
    message: '본인의 캠페인 신청자만 선정할 수 있습니다.',
  })
  @ApiNotFoundError({
    path: '/v1/applications/{id}/select',
    description: '신청 정보가 존재하지 않음',
    message: '신청 정보를 찾을 수 없습니다.',
  })
  @ApiConflictError({
    path: '/v1/applications/{id}/select',
    description: '이미 처리된 신청',
    message: '이미 처리된 신청입니다.',
  })
  @ApiStandardErrors('/v1/applications/{id}/select')
  @Patch(':id/select')
  @HttpCode(200)
  async select(@Request() req: any, @Param('id') id: string) {
    const data = await this.applicationsService.selectApplicant(req.user.id, id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '신청자 거절 (광고주 전용)',
    description: '특정 신청자를 거절 처리합니다.',
  })
  @ApiResponse({ status: 200, description: '거절 성공', type: Application })
  @ApiForbiddenError({
    path: '/v1/applications/{id}/reject',
    description: '본인 캠페인이 아니거나 신청 정보 없음',
    message: '권한이 없습니다.',
  })
  @ApiStandardErrors('/v1/applications/{id}/reject')
  @Patch(':id/reject')
  @HttpCode(200)
  async reject(@Request() req: any, @Param('id') id: string) {
    const data = await this.applicationsService.rejectApplicant(req.user.id, id);
    return {
      success: true,
      data,
    };
  }
}
