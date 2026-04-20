import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadge, BadgeType } from './entities/user-badge.entity';

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
  ) {}

  async findByUserId(userId: string): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * 배지 수동 지급 로직 (관리자용 또는 내부 로직용)
   */
  async grantBadge(userId: string, badgeType: BadgeType): Promise<UserBadge> {
    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeType },
    });
    if (existing) return existing;

    const badge = this.userBadgeRepository.create({ userId, badgeType });
    return this.userBadgeRepository.save(badge);
  }
}
