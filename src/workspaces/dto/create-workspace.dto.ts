import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkspaceCategory } from '../entities/workspace.entity';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: '워크스페이스 제목',
    example: '성수동 카페 A 촬영',
    required: true,
  })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '제목은 필수 입력 항목입니다.' })
  @MaxLength(100, { message: '제목은 최대 100자까지 가능합니다.' })
  title: string;

  @ApiProperty({
    description: '촬영 장소',
    example: '서울 성동구',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '장소는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '장소는 최대 100자까지 가능합니다.' })
  location?: string;

  @ApiProperty({
    description: '카테고리',
    enum: WorkspaceCategory,
    example: WorkspaceCategory.FOOD,
    required: true,
  })
  @IsEnum(WorkspaceCategory, { message: '올바른 카테고리를 선택해주세요.' })
  @IsNotEmpty({ message: '카테고리는 필수 선택 항목입니다.' })
  category: WorkspaceCategory;

  @ApiProperty({
    description: '캠페인 가이드 (텍스트)',
    example: '필수 촬영 항목: 메뉴 전체컷, 카페 외관...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '가이드는 문자열이어야 합니다.' })
  campaignGuide?: string;

  @ApiProperty({
    description: '초기 투두 항목 리스트 (선택)',
    example: ['외관 정면', '메뉴판 상세'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true, message: '투두 항목은 문자열이어야 합니다.' })
  todoPreset?: string[];
}
