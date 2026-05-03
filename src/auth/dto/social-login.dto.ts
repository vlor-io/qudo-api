import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OAuthProvider } from '@/users/entities/oauth-identity.entity';

export class SocialLoginDto {
  @ApiProperty({
    description: '소셜 로그인 제공자',
    enum: OAuthProvider,
    example: OAuthProvider.KAKAO,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({
    description: 'Kakao / Naver 필수. Google 은 idToken 미제공 시 사용',
    example: 'kakao_oauth_access_token_example',
    required: false,
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({
    description: 'Apple 필수, Google 권장. provider 가 발급한 ID Token (JWT)',
    required: false,
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiProperty({
    description: 'Apple 첫 로그인 보강용. provider 가 이름을 안 줄 때 클라이언트가 직접 전달',
    required: false,
    example: '김스냅',
  })
  @IsOptional()
  @IsString()
  displayNameHint?: string;
}
