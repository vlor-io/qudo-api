import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PresignAvatarDto {
  @ApiProperty({ description: '원본 파일명', example: 'me.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: '파일 MIME 타입', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
