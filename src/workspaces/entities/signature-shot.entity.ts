import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from './workspace.entity';

@Entity('signature_shots')
export class SignatureShot {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '워크스페이스 ID' })
  @Column()
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @ApiProperty({ description: '가이드 이미지 URL', example: 'https://cdn.qudo.app/guides/sample.jpg' })
  @Column()
  imageUri: string;

  @ApiProperty({ description: '가이드 설명 (예: 구도 정보)', example: '정면에서 45도 각도로 촬영' })
  @Column({ nullable: true })
  label: string;

  @ApiProperty({ description: '정렬 순서', example: 0 })
  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;
}
