import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    UsersModule, // User plan 상태 동기화를 위해 필요
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
