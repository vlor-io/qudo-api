import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  X = 'x',
  BLOG = 'blog',
}

@Entity('channels')
export class Channel {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.channels, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '플랫폼', enum: SocialPlatform, example: SocialPlatform.INSTAGRAM })
  @Column({ type: 'enum', enum: SocialPlatform })
  platform: SocialPlatform;

  @ApiProperty({ description: '핸들 또는 아이디', example: '@qudo_official' })
  @Column()
  handle: string;

  @ApiProperty({ description: '팔로워 수', example: 12500 })
  @Column({ default: 0 })
  followers: number;

  @ApiProperty({ description: '연결 여부 (인증 완료 여부)', example: true })
  @Column({ default: false })
  connected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
