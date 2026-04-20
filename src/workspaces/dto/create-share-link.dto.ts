import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CreateShareLinkDto {
  @ApiProperty({
    description: '공유 페이지 접근 비밀번호 (선택)',
    example: '1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: '만료 시간 (단위: 시간, 기본 72시간)',
    example: 24,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInHours?: number;
}
