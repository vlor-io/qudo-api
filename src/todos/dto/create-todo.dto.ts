import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @ApiProperty({
    description: '투두 항목 라벨',
    example: '카페 외관 정면 촬영',
    required: true,
  })
  @IsString({ message: '라벨은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '라벨은 필수 입력 항목입니다.' })
  @MaxLength(100, { message: '라벨은 최대 100자까지 가능합니다.' })
  label: string;

  @ApiProperty({
    description: '정렬 순서',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '순서는 숫자여야 합니다.' })
  order?: number;
}
