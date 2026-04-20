import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Campaign, CampaignStatus, CampaignType, CampaignCategory } from './entities/campaign.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiPublicStandardErrors,
} from '@/common/decorators/api-standard-errors.decorator';

const CAMPAIGN_NOT_FOUND_MSG = '해당 캠페인을 찾을 수 없습니다.';

@ApiTags('Campaigns (캠페인)')
@Controller('v1/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @ApiOperation({
    summary: '캠페인 목록 조회 (둘러보기)',
    description: '전체 캠페인 목록을 조회합니다. 필터링 및 검색이 가능합니다.',
  })
  @ApiQuery({ name: 'type', enum: CampaignType, required: false })
  @ApiQuery({ name: 'category', enum: CampaignCategory, required: false })
  @ApiQuery({ name: 'status', enum: CampaignStatus, required: false })
  @ApiQuery({ name: 'q', required: false, description: '검색어 (제목, 브랜드)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiBadRequestError({
    path: '/v1/campaigns',
    description: '쿼리 파라미터 형식 오류',
    cases: {
      '잘못된 enum 값': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['type must be a valid enum value'],
      },
    },
  })
  @ApiPublicStandardErrors('/v1/campaigns')
  @Public() // 캠페인 목록은 비로그인 사용자도 볼 수 있음
  @Get()
  async findAll(
    @Query('type') type?: CampaignType,
    @Query('category') category?: CampaignCategory,
    @Query('status') status?: CampaignStatus,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const data = await this.campaignsService.findAll({ type, category, status, q, page, pageSize });
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '캠페인 상세 조회',
    description: '특정 캠페인의 상세 정보를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: Campaign })
  @ApiNotFoundError({
    path: '/v1/campaigns/{id}',
    description: '캠페인이 존재하지 않음',
    message: CAMPAIGN_NOT_FOUND_MSG,
  })
  @ApiPublicStandardErrors('/v1/campaigns/{id}')
  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.campaignsService.findOne(id);
    return {
      success: true,
      data,
    };
  }

  // --- 광고주 전용 엔드포인트 ---

  @ApiOperation({
    summary: '광고주 본인 캠페인 목록 조회',
    description: '로그인된 광고주가 등록한 캠페인 리스트를 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Campaign] })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiStandardErrors('/v1/campaigns/advertiser/list')
  @Get('advertiser/list')
  async findByAdvertiser(@Request() req: any) {
    const data = await this.campaignsService.findByAdvertiser(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '새 캠페인 등록 (광고주 전용)',
    description: '광고주가 새로운 체험단/광고 캠페인을 등록합니다.',
  })
  @ApiResponse({ status: 201, description: '등록 성공', type: Campaign })
  @ApiBadRequestError({
    path: '/v1/campaigns',
    description: '입력값 오류',
    cases: {
      '제목 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['title should not be empty'],
      },
      '잘못된 카테고리': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['category must be a valid enum value'],
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiStandardErrors('/v1/campaigns')
  @Post()
  async create(@Request() req: any, @Body() dto: CreateCampaignDto) {
    const data = await this.campaignsService.create(req.user.id, dto);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '캠페인 수정 (광고주 전용)',
    description: '본인이 등록한 캠페인의 정보를 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정 성공', type: Campaign })
  @ApiBadRequestError({
    path: '/v1/campaigns/{id}',
    description: '입력값 오류',
    validationDetails: ['title should not be empty'],
  })
  @ApiForbiddenError({
    path: '/v1/campaigns/{id}',
    description: '본인의 캠페인이 아님',
    message: '본인의 캠페인만 수정할 수 있습니다.',
  })
  @ApiNotFoundError({
    path: '/v1/campaigns/{id}',
    description: '캠페인이 존재하지 않음',
    message: CAMPAIGN_NOT_FOUND_MSG,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiStandardErrors('/v1/campaigns/{id}')
  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    const data = await this.campaignsService.update(req.user.id, id, dto);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '캠페인 삭제 (광고주 전용)',
    description: '본인이 등록한 캠페인을 삭제(소프트 삭제)합니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiForbiddenError({
    path: '/v1/campaigns/{id}',
    description: '본인의 캠페인이 아님',
    message: '본인의 캠페인만 삭제할 수 있습니다.',
  })
  @ApiNotFoundError({
    path: '/v1/campaigns/{id}',
    description: '캠페인이 존재하지 않음',
    message: CAMPAIGN_NOT_FOUND_MSG,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiStandardErrors('/v1/campaigns/{id}')
  @Delete(':id')
  @HttpCode(200)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.campaignsService.remove(req.user.id, id);
    return {
      success: true,
      data: null,
    };
  }
}
