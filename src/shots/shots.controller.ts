import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, Query, Res } from '@nestjs/common';
import { Response as ExResponse } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShotsService } from './shots.service';
import { Shot } from './entities/shot.entity';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiForbiddenError,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Shots (촬영물)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/shots')
export class ShotsController {
  constructor(
    private readonly shotsService: ShotsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @ApiOperation({
    summary: '촬영물 업로드 확정',
    description: 'R2에 업로드한 파일의 키를 전달하여 촬영물로 확정합니다. 연결된 투두 자동 완료 처리.',
  })
  @ApiResponse({ status: 201, description: '확정 성공', type: Shot })
  @ApiBadRequestError({
    path: '/v1/shots/confirm',
    description: '입력값 오류',
    validationDetails: ['r2Key should not be empty', 'workspaceId must be a UUID'],
  })
  @ApiNotFoundError({
    path: '/v1/shots/confirm',
    description: '연결 대상을 찾을 수 없음',
    cases: {
      '워크스페이스 없음': {
        code: 'NOT_FOUND',
        message: '해당 워크스페이스를 찾을 수 없습니다.',
      },
      '투두 없음': {
        code: 'NOT_FOUND',
        message: '연결할 투두 항목을 찾을 수 없습니다.',
      },
    },
  })
  @ApiStandardErrors('/v1/shots/confirm')
  @Post('confirm')
  @HttpCode(201)
  async confirm(@Request() req: any, @Body() dto: ConfirmUploadDto) {
    const shot = await this.shotsService.confirmUpload(req.user.id, dto);
    await this.workspacesService.recalculateProgress(dto.workspaceId);
    return { success: true, data: shot };
  }

  @ApiOperation({
    summary: '워크스페이스 촬영물 목록 조회',
    description: '특정 워크스페이스에 속한 모든 촬영물을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Shot] })
  @ApiNotFoundError({
    path: '/v1/shots/workspace/{workspaceId}',
    description: '워크스페이스가 존재하지 않음',
    message: '해당 워크스페이스를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/shots/workspace/{workspaceId}')
  @Get('workspace/:workspaceId')
  async getByWorkspace(@Param('workspaceId') workspaceId: string) {
    const data = await this.shotsService.findAll(workspaceId);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '촬영물 삭제',
    description: '촬영물을 삭제합니다. R2 파일도 함께 제거됩니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiForbiddenError({
    path: '/v1/shots/{id}',
    description: '본인 촬영물이 아님',
    message: '해당 촬영물에 대한 삭제 권한이 없습니다.',
  })
  @ApiNotFoundError({
    path: '/v1/shots/{id}',
    description: '촬영물이 존재하지 않음',
    message: '해당 촬영물을 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/shots/{id}')
  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.shotsService.deleteShot(req.user.id, id);
    return { success: true, data: null };
  }

  @ApiOperation({
    summary: '썸네일 조회 (실시간 리사이징)',
    description: '촬영물의 썸네일을 요청 시 실시간으로 리사이징하여 반환합니다.',
  })
  @ApiQuery({ name: 'w', required: false, description: '너비(px)', example: 300 })
  @ApiQuery({ name: 'h', required: false, description: '높이(px)', example: 300 })
  @ApiQuery({ name: 'fit', required: false, description: '리사이징 방식', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] })
  @ApiResponse({ status: 200, description: '이미지 스트림 반환 (image/jpeg)' })
  @ApiNotFoundError({
    path: '/v1/shots/{id}/thumbnail',
    description: '촬영물 또는 원본 파일이 존재하지 않음',
    cases: {
      '촬영물 없음': {
        code: 'NOT_FOUND',
        message: '해당 촬영물을 찾을 수 없습니다.',
      },
      'R2 파일 없음': {
        code: 'NOT_FOUND',
        message: 'R2 스토리지에서 원본 파일을 찾을 수 없습니다.',
      },
    },
  })
  @ApiStandardErrors('/v1/shots/{id}/thumbnail')
  @Get(':id/thumbnail')
  async getThumbnail(
    @Res() res: ExResponse,
    @Param('id') id: string,
    @Query('w') w?: number,
    @Query('h') h?: number,
    @Query('fit') fit: any = 'cover',
  ) {
    const buffer = await this.shotsService.getThumbnail(id, w, h, fit);
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @ApiOperation({
    summary: '원본 이미지 조회 / 다운로드',
    description: '촬영물의 원본 이미지를 반환합니다. download=true 시 파일 다운로드로 동작합니다.',
  })
  @ApiQuery({ name: 'download', required: false, description: 'true 로 보내면 파일 다운로드', example: 'true' })
  @ApiResponse({ status: 200, description: '이미지 스트림 반환 (image/jpeg)' })
  @ApiNotFoundError({
    path: '/v1/shots/{id}/image',
    description: '촬영물 또는 원본 파일이 존재하지 않음',
    cases: {
      '촬영물 없음': {
        code: 'NOT_FOUND',
        message: '해당 촬영물을 찾을 수 없습니다.',
      },
      'R2 파일 없음': {
        code: 'NOT_FOUND',
        message: 'R2 스토리지에서 원본 파일을 찾을 수 없습니다.',
      },
    },
  })
  @ApiStandardErrors('/v1/shots/{id}/image')
  @Get(':id/image')
  async getFullImage(
    @Res() res: ExResponse,
    @Param('id') id: string,
    @Query('download') download: string,
  ) {
    const { buffer, fileName } = await this.shotsService.getShotImage(id);
    res.set('Content-Type', 'image/jpeg');
    if (download === 'true') {
      res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    } else {
      res.set('Content-Disposition', 'inline');
    }
    res.send(buffer);
  }
}
