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
    description: 'Naver 필수. (Naver 는 OIDC 미지원으로 access_token + nid/me API 검증 흐름 유지)',
    example: 'naver_oauth_access_token_example',
    required: false,
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({
    description: 'Kakao / Google 필수. provider 가 발급한 OIDC ID Token (JWT). 백엔드는 JWKS 로 서명만 검증 (외부 호출 0).',
    required: false,
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiProperty({
    description: 'provider 가 이름을 주지 않는 경우 클라이언트가 직접 전달 (선택)',
    required: false,
    example: '김스냅',
  })
  @IsOptional()
  @IsString()
  displayNameHint?: string;
}
