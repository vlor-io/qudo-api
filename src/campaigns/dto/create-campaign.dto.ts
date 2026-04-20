import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, MaxLength, IsDateString } from 'class-validator';
import { CampaignType, CampaignCategory } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty({
    description: '캠페인 제목',
    example: '강남 스시 오마카세 체험단',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: '브랜드 명칭',
    example: '스시하나',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @ApiProperty({
    description: '캠페인 타입',
    enum: CampaignType,
    example: CampaignType.VISIT,
    required: true,
  })
  @IsEnum(CampaignType)
  @IsNotEmpty()
  type: CampaignType;

  @ApiProperty({
    description: '카테고리',
    enum: CampaignCategory,
    example: CampaignCategory.FOOD,
    required: true,
  })
  @IsEnum(CampaignCategory)
  @IsNotEmpty()
  category: CampaignCategory;

  @ApiProperty({
    description: '장소 (방문형인 경우 필수)',
    example: '서울 강남구',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiProperty({
    description: '신청 마감일 (YYYY-MM-DD)',
    example: '2026-04-30',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({
    description: '모집 인원',
    example: 5,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  slots: number;

  @ApiProperty({
    description: '제공 혜택',
    example: '2인 코스 식사 제공',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  reward: string;

  @ApiProperty({
    description: '참여 조건 리스트',
    example: ['팔로워 1k 이상', '방문 후 3일 내 포스팅'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiProperty({
    description: '초기 투두 프리셋',
    example: ['음식 클로즈업', '매장 분위기'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  todoPreset?: string[];

  @ApiProperty({
    description: '썸네일 배경 컬러',
    example: '#FF6B6B',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  thumbnailColor?: string;
}
