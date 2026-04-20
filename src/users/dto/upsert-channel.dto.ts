import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { SocialPlatform } from '../entities/channel.entity';

export class UpsertChannelDto {
  @ApiProperty({
    description: '플랫폼 종류',
    enum: SocialPlatform,
    example: SocialPlatform.INSTAGRAM,
  })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty({
    description: '플랫폼 핸들 또는 아이디',
    example: '@qudo_official',
  })
  @IsString()
  @IsNotEmpty()
  handle: string;

  @ApiProperty({
    description: '팔로워 수',
    example: 12500,
  })
  @IsNumber()
  @Min(0)
  followers: number;
}
