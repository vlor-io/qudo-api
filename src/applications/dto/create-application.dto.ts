import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    description: '광고주에게 남기는 지원 메시지',
    example: '평소 SushiHana를 좋아해서 꼭 다녀오고 싶습니다!',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '메시지는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '메시지는 최대 500자까지 가능합니다.' })
  note?: string;
}
