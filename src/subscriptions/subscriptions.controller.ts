import { Controller, Get, Post, Delete, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Subscriptions (구독/요금제)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiOperation({
    summary: '현재 내 구독 정보 조회',
    description: '로그인된 사용자의 활성화된 구독 정보를 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: Subscription })
  @ApiStandardErrors('/v1/subscriptions/me')
  @Get('me')
  async getMySubscription(@Request() req: any) {
    const data = await this.subscriptionsService.findActiveSubscription(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: 'Pro 플랜으로 업그레이드',
    description: '사용자의 요금제를 Pro로 변경합니다. (현재는 즉시 처리 시뮬레이션)',
  })
  @ApiResponse({ status: 200, description: '업그레이드 성공', type: Subscription })
  @ApiStandardErrors('/v1/subscriptions/upgrade')
  @Post('upgrade')
  @HttpCode(200)
  async upgrade(@Request() req: any) {
    const data = await this.subscriptionsService.upgrade(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @ApiOperation({
    summary: '구독 취소',
    description: 'Pro 플랜 구독을 취소하고 Free로 전환합니다.',
  })
  @ApiResponse({ status: 200, description: '취소 성공' })
  @ApiStandardErrors('/v1/subscriptions/cancel')
  @Delete('cancel')
  async cancel(@Request() req: any) {
    await this.subscriptionsService.cancel(req.user.id);
    return {
      success: true,
      message: '구독이 정상적으로 취소되었습니다.',
    };
  }
}
