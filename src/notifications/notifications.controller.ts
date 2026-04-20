import { Controller, Get, Patch, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiStandardErrors,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Notifications (알림)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    summary: '내 알림 목록 조회',
    description: '로그인된 사용자의 모든 알림 목록을 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Notification] })
  @ApiStandardErrors('/v1/notifications')
  @Get()
  async getMyNotifications(@Request() req: any) {
    const data = await this.notificationsService.findAll(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '알림 읽음 처리',
    description: '특정 알림을 읽음(Checked) 상태로 변경합니다.',
  })
  @ApiResponse({ status: 200, description: '처리 성공' })
  @ApiNotFoundError({
    path: '/v1/notifications/{id}/read',
    description: '알림이 존재하지 않거나 본인 알림이 아님',
    message: '알림을 찾을 수 없습니다.',
  })
  @ApiStandardErrors('/v1/notifications/{id}/read')
  @Patch(':id/read')
  @HttpCode(200)
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return {
      success: true,
    };
  }
}
