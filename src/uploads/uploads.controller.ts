import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Uploads (업로드)')
@ApiBearerAuth()
@Controller('v1/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiOperation({
    summary: 'S3 업로드 티켓(Presigned URL) 발급',
    description: '클라이언트에서 S3로 직접 파일을 업로드하기 위한 티켓을 발급합니다. 전송 방식은 PUT을 권장합니다.',
  })
  @ApiResponse({ status: 200, description: '발급 성공' })
  @ApiBadRequestError({
    path: '/v1/uploads/presign',
    description: '입력값 오류',
    validationDetails: ['fileName should not be empty', 'workspaceId must be a UUID'],
  })
  @ApiNotFoundError({
    path: '/v1/uploads/presign',
    description: '워크스페이스가 존재하지 않음',
    message: '해당 워크스페이스를 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/uploads/presign')
  @UseGuards(JwtAuthGuard)
  @Post('presign')
  @HttpCode(200)
  async getPresignedUrl(@Request() req: any, @Body() dto: CreatePresignedUrlDto) {
    const userId = req.user.id;

    const data = await this.uploadsService.getPresignedUrl({
      fileName: dto.fileName,
      contentType: dto.contentType || 'application/octet-stream',
      todoId: dto.todoId,
      workspaceId: dto.workspaceId,
      userId,
    });

    return {
      success: true,
      data,
    };
  }
}
