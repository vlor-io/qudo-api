import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from './workspace.entity';

@Entity('share_links')
export class ShareLink {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '워크스페이스 ID' })
  @Column()
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @ApiProperty({ description: '공유용 고유 토큰', example: 'abc-123-xyz' })
  @Column({ unique: true })
  token: string;

  @ApiProperty({ description: '비밀번호 해시 (선택)', required: false })
  @Column({ nullable: true })
  passwordHash: string;

  @ApiProperty({ description: '만료 일시', required: false })
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @ApiProperty({ description: '조회수', example: 5 })
  @Column({ default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
