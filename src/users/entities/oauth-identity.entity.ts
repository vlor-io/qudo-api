import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

export enum OAuthProvider {
  KAKAO = 'kakao',
  NAVER = 'naver',
  GOOGLE = 'google',
  APPLE = 'apple',
}

@Entity('oauth_identities')
@Unique('uq_oauth_provider_pid', ['provider', 'providerId'])
@Index('idx_oauth_user', ['userId'])
export class OAuthIdentity {
  @ApiProperty({ description: '고유 식별자 (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '연결된 사용자 ID' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.oauthIdentities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'OAuth 공급자', enum: OAuthProvider, example: OAuthProvider.KAKAO })
  @Column({ type: 'enum', enum: OAuthProvider })
  provider: OAuthProvider;

  @ApiProperty({ description: 'provider 가 발급한 사용자 고유 ID', example: '12345678' })
  @Column({ type: 'varchar', length: 255 })
  providerId: string;

  @ApiProperty({ description: 'provider 가 제공한 이메일 스냅샷', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @ApiProperty({ description: 'provider 가 제공한 표시 이름 스냅샷', required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string;

  @ApiProperty({ description: 'provider 가 제공한 아바타 URI 스냅샷', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUri: string;

  @ApiProperty({ description: '이 identity 로 마지막 로그인한 시각', required: false })
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
