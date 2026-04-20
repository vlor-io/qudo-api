import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';
import { UserBadge } from './entities/user-badge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserBadge])],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
