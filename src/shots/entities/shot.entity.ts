import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { Todo } from '@/todos/entities/todo.entity';
import { User } from '@/users/entities/user.entity';

@Entity('shots')
export class Shot {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '워크스페이스 ID' })
  @Column()
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @ApiProperty({ description: '투두 항목 ID' })
  @Column()
  todoId: string;

  @ManyToOne(() => Todo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'todoId' })
  todo: Todo;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: '이미지 URI', example: 'https://qudo-s3.vlor.kr/shots/...' })
  @Column()
  imageUri: string;

  @ApiProperty({ description: 'AI 검증 결과 (JSON)', example: { isRelevant: true, confidence: 0.98 } })
  @Column({ type: 'jsonb', nullable: true })
  aiVerification: any;

  @ApiProperty({ description: '업로드 태그 (기타 피드백 등)', required: false })
  @Column({ nullable: true })
  tag: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
