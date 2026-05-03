import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ParseCampaignGuideDto {
  @ApiProperty({
    description: '광고주가 전달한 캠페인 가이드 원문 (필수 컷·마감일·법적 고지 등 포함)',
    example: '맛집 체험단 미션입니다. 매장 외관 1컷, 메뉴판 1컷, 메인 메뉴 클로즈업 2컷 필수입니다. 마감 2026-06-01. #광고 표기 필수.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  text: string;

  @ApiProperty({
    description: '추출된 투두를 워크스페이스에 즉시 저장할지 여부 (기본 true)',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  applyTodos?: boolean;
}
