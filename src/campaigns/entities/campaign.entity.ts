import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';

export enum CampaignType {
  DELIVERY = 'delivery',
  VISIT = 'visit',
}

export enum CampaignCategory {
  FOOD = 'FOOD',
  PRODUCT = 'PRODUCT',
  BEAUTY = 'BEAUTY',
  TRAVEL = 'TRAVEL',
  LIFESTYLE = 'LIFESTYLE',
  DETAIL_PAGE = 'DETAIL_PAGE',
}

export enum CampaignStatus {
  RECRUITING = 'recruiting',
  CLOSED = 'closed',
  ANNOUNCED = 'announced',
}

@Entity('campaigns')
export class Campaign {
  @ApiProperty({ description: '고유 식별자 (UUID)', example: 'c1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '광고주 ID', example: 'u1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @Column()
  advertiserId: string;

  @ManyToOne(() => User)
  advertiser: User;

  @ApiProperty({ description: '캠페인 제목', example: '강남 스시 오마카세 체험단' })
  @Column({ type: 'varchar', length: 100 })
  title: string;

  @ApiProperty({ description: '브랜드 명칭', example: '스시하나' })
  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @ApiProperty({ description: '캠페인 타입', enum: CampaignType, example: CampaignType.VISIT })
  @Column({ type: 'enum', enum: CampaignType })
  type: CampaignType;

  @ApiProperty({ description: '카테고리', enum: CampaignCategory, example: CampaignCategory.FOOD })
  @Column({ type: 'enum', enum: CampaignCategory })
  category: CampaignCategory;

  @ApiProperty({ description: '장소 (방문형 전용)', example: '서울 강남구', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @ApiProperty({ description: '신청 마감일', example: '2026-04-30' })
  @Column({ type: 'date' })
  deadline: Date;

  @ApiProperty({ description: '모집 인원', example: 5 })
  @Column({ type: 'int' })
  slots: number;

  @ApiProperty({ description: '현재 신청자 수', example: 12 })
  @Column({ type: 'int', default: 0 })
  applicantsCount: number;

  @ApiProperty({ description: '제공 혜택', example: '2인 코스 식사 제공' })
  @Column({ type: 'text' })
  reward: string;

  @ApiProperty({ description: '썸네일 URL', required: false })
  @Column({ type: 'varchar', nullable: true })
  thumbnailUri: string;

  @ApiProperty({ description: '썸네일 배경 컬러', example: '#FF6B6B' })
  @Column({ type: 'varchar', length: 7, default: '#FF6B6B' })
  thumbnailColor: string;

  @ApiProperty({ description: '상태', enum: CampaignStatus, example: CampaignStatus.RECRUITING })
  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.RECRUITING })
  status: CampaignStatus;

  @ApiProperty({ description: '참여 조건 리스트', example: ['팔로워 1k 이상', '방문 후 3일 내 포스팅'] })
  @Column({ type: 'jsonb', default: [] })
  requirements: string[];

  @ApiProperty({ description: '초기 투두 프리셋', example: ['음식 클로즈업', '매장 분위기'] })
  @Column({ type: 'jsonb', default: [] })
  todoPreset: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
