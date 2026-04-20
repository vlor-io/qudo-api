import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';

export enum WorkspaceCategory {
  FOOD = 'FOOD',
  PRODUCT = 'PRODUCT',
  DETAIL_PAGE = 'DETAIL_PAGE',
  TRAVEL = 'TRAVEL',
}

export enum WorkspaceStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('workspaces')
export class Workspace {
  @ApiProperty({ description: '고유 식별자 (UUID)', example: 'w7ba91ef-158d-43a2-a441-c7e5b7578642' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'u1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '연관된 캠페인 ID (선택)', required: false })
  @Column({ nullable: true })
  campaignId: string;

  @ApiProperty({ description: '워크스페이스 제목', example: '성수동 카페 A 촬영' })
  @Column({ type: 'varchar', length: 100 })
  title: string;

  @ApiProperty({ description: '촬영 장소', example: '서울 성동구' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @ApiProperty({ description: '카테고리', enum: WorkspaceCategory, example: WorkspaceCategory.FOOD })
  @Column({ type: 'enum', enum: WorkspaceCategory })
  category: WorkspaceCategory;

  @ApiProperty({ description: '상태', enum: WorkspaceStatus, example: WorkspaceStatus.ACTIVE })
  @Column({ type: 'enum', enum: WorkspaceStatus, default: WorkspaceStatus.ACTIVE })
  status: WorkspaceStatus;

  @ApiProperty({ description: '진행률 (0-100)', example: 75 })
  @Column({ type: 'smallint', default: 0 })
  progress: number;

  @ApiProperty({ description: '캠페인 가이드 텍스트', required: false })
  @Column({ type: 'text', nullable: true })
  campaignGuide: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
