import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { Channel } from './channel.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum UserPlan {
  FREE = 'free',
  PREMIUM = 'premium',
}

export enum UserRole {
  CREATOR = 'creator',
  ADVERTISER = 'advertiser',
}

@Entity('users')
export class User {
  @ApiProperty({ description: '고유 식별자 (UUID)', example: 'f4ba91ef-158d-43a2-a441-c7e5b7578642' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 표시 이름', example: '김스냅' })
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @ApiProperty({ description: '이메일 주소', example: 'qudo@example.com', required: false })
  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @ApiProperty({ description: '아바타 이미지 URL', example: 'https://cdn.qudo.app/avatars/u_1.jpg', required: false })
  @Column({ type: 'varchar', nullable: true })
  avatarUri: string;

  @ApiProperty({ description: '요금제 플랜', enum: UserPlan, example: UserPlan.FREE })
  @Column({ type: 'enum', enum: UserPlan, default: UserPlan.FREE })
  plan: UserPlan;

  @ApiProperty({ description: '사용자 역할', enum: UserRole, example: UserRole.CREATOR })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CREATOR })
  role: UserRole;

  @ApiProperty({ description: '총 워크스페이스 수', example: 5 })
  @Column({ type: 'int', default: 0 })
  totalWorkspaces: number;

  @ApiProperty({ description: '총 업로드 사진 수', example: 124 })
  @Column({ type: 'int', default: 0 })
  totalShots: number;

  @ApiProperty({ description: '획득 배지 수', example: 3 })
  @Column({ type: 'int', default: 0 })
  totalBadges: number;

  @ApiProperty({ description: '사용자 소개(Bio)', example: '음식/뷰티 전문 크리에이터', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  bio: string;

  @ApiProperty({ description: '해싱된 비밀번호', required: false })
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string;

  @ApiProperty({ description: 'OAuth 공급자 식별 ID', example: 'kakao_123456789' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  providerId: string;

  @ApiProperty({ description: '전역 고유 워크스페이스 키', example: '240419123000_abcd' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  workspaceKey: string;


  @ApiProperty({ description: '계정 생성일' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '정보 수정일' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '탈퇴 처리일 (소프트 삭제)', required: false })
  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => Channel, (channel) => channel.user)
  channels: Channel[];
}
