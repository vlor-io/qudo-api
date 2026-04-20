import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';
import { UserBadge } from './entities/user-badge.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-standard-errors.decorator';

@ApiTags('Badges (배지)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @ApiOperation({
    summary: '내 획득 배지 목록 조회',
    description: '로그인된 사용자가 획득한 모든 배지 목록을 가져옵니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [UserBadge] })
  @ApiStandardErrors('/v1/badges/me')
  @Get('me')
  async getMyBadges(@Request() req: any) {
    const data = await this.badgesService.findByUserId(req.user.id);
    return {
      success: true,
      data,
    };
  }
}
