import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';

export enum BadgeType {
  FIRST_SHOT = 'first_shot',
  TEN_SHOTS = 'ten_shots',
  FOOD_MASTER = 'food_master',
  BEAUTY_MASTER = 'beauty_master',
  TRAVEL_MASTER = 'travel_master',
  PRODUCT_MASTER = 'product_master',
  FAST_PICK = 'fast_pick',
  QUDO_PRO = 'qudo_pro',
  POPULAR_CREATOR = 'popular_creator',
  LEGEND_CREATOR = 'legend_creator',
}

@Entity('user_badges')
export class UserBadge {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '배지 종류', enum: BadgeType, example: BadgeType.FIRST_SHOT })
  @Column({ type: 'enum', enum: BadgeType })
  badgeType: BadgeType;

  @ApiProperty({ description: '획득 일시' })
  @CreateDateColumn()
  earnedAt: Date;
}
