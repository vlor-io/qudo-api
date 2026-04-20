import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';

export enum PlanType {
  FREE = 'free',
  PRO = 'pro',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

@Entity('subscriptions')
export class Subscription {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '요금제 종류', enum: PlanType, example: PlanType.PRO })
  @Column({ type: 'enum', enum: PlanType, default: PlanType.FREE })
  planType: PlanType;

  @ApiProperty({ description: '구독 상태', enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({ description: '구독 시작 일시' })
  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @ApiProperty({ description: '구독 만료 일시' })
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @ApiProperty({ description: '외부 결제 고유 ID (Stripe 등)', required: false })
  @Column({ nullable: true })
  paymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
