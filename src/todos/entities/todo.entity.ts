import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from '@/workspaces/entities/workspace.entity';

export enum TodoStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

@Entity('todos')
export class Todo {
  @ApiProperty({ description: '고유 식별자 (UUID)', example: 't1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '워크스페이스 ID', example: 'w7ba91ef-158d-43a2-a441-c7e5b7578642' })
  @Column()
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @ApiProperty({ description: '투두 항목 라벨', example: '카페 외관 정면 촬영' })
  @Column({ type: 'varchar', length: 100 })
  label: string;

  @ApiProperty({ description: '상태', enum: TodoStatus, example: TodoStatus.PENDING })
  @Column({ type: 'enum', enum: TodoStatus, default: TodoStatus.PENDING })
  status: TodoStatus;

  @ApiProperty({ description: '정렬 순서', example: 1 })
  @Column({ type: 'int', default: 0 })
  order: number;

  @ApiProperty({ description: '업로드된 이미지 URL 목록', example: ['https://cdn.qudo.app/shots/1.jpg'] })
  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
