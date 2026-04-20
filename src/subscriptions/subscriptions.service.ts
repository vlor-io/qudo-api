import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, PlanType, SubscriptionStatus } from './entities/subscription.entity';
import { UsersService } from '@/users/users.service';
import { UserPlan } from '@/users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly usersService: UsersService,
  ) {}

  async findActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async upgrade(userId: string): Promise<Subscription> {
    // 1. 기존 구독 취소 처리 (있는 경우)
    await this.subscriptionRepository.update(
      { userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.EXPIRED },
    );

    // 2. 새 PRO 구독 생성
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1개월 구독

    const subscription = this.subscriptionRepository.create({
      userId,
      planType: PlanType.PRO,
      status: SubscriptionStatus.ACTIVE,
      startedAt,
      expiresAt,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    // 3. User 엔티티의 plan 상태 동기화
    await this.usersService.updateProfile(userId, { plan: UserPlan.PREMIUM });

    return saved;
  }

  async cancel(userId: string): Promise<void> {
    await this.subscriptionRepository.update(
      { userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELED },
    );
    
    // 즉시 다운그레이드하거나 만료 시점에 처리할 수 있으나, 여기서는 즉시 처리 예시
    await this.usersService.updateProfile(userId, { plan: UserPlan.FREE });
  }
}
