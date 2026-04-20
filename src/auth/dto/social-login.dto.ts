import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({
    description: '소셜 로그인 제공자',
    enum: ['kakao', 'naver', 'google', 'apple'],
    example: 'kakao',
  })
  provider: string;

  @ApiProperty({
    description: '소셜 앱에서 발급받은 Access Token 또는 ID Token',
    example: 'social_oauth_token_example_123',
  })
  token: string;
}
