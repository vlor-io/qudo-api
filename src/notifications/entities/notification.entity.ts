import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';

export enum NotificationType {
  SYSTEM = 'system',
  CAMPAIGN = 'campaign',
  MESSAGE = 'message',
}

@Entity('notifications')
export class Notification {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '알림 유형', enum: NotificationType, example: NotificationType.CAMPAIGN })
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: '제목', example: '캠페인 선정 알림' })
  @Column()
  title: string;

  @ApiProperty({ description: '내용', example: 'SushiHana 캠페인 크리에이터로 선정되셨습니다!' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: '확인 여부', example: false })
  @Column({ default: false })
  isRead: boolean;

  @ApiProperty({ description: '이동 링크 (딥링크 등)', required: false, example: '/workspace/uuid' })
  @Column({ nullable: true })
  link: string;

  @CreateDateColumn()
  createdAt: Date;
}
