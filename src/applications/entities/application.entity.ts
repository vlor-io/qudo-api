import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/users/entities/user.entity';
import { Campaign } from '@/campaigns/entities/campaign.entity';

export enum ApplicationStatus {
  APPLIED = 'applied',
  SELECTED = 'selected',
  REJECTED = 'rejected',
}

@Entity('applications')
@Unique(['campaignId', 'userId']) // 한 캠페인에 한 번만 신청 가능
export class Application {
  @ApiProperty({ description: '고유 식별자 (UUID)', example: 'a1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '캠페인 ID', example: 'c1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @Column()
  campaignId: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  campaign: Campaign;

  @ApiProperty({ description: '신청자(UserId)', example: 'u1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: '자동 생성된 워크스페이스 ID (선정 시 부여)', required: false })
  @Column({ nullable: true })
  workspaceId: string;

  @ApiProperty({ description: '신청 상태', enum: ApplicationStatus, example: ApplicationStatus.APPLIED })
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @ApiProperty({ description: '광고주에게 남기는 말', example: '평소 SushiHana를 좋아해서 꼭 다녀오고 싶습니다!' })
  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  appliedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
