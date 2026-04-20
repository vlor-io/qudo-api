import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: '사용자 표시 이름',
    example: '김스냅',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @MaxLength(20, { message: '이름은 최대 20자까지 가능합니다.' })
  displayName?: string;

  @ApiProperty({
    description: '사용자 소개글 (Bio)',
    example: '음식/뷰티 전문 크리에이터입니다.',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '소개글은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '소개글은 최대 100자까지 가능합니다.' })
  bio?: string;
}
