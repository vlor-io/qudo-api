import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: '서버에서 발급받은 Refresh Token',
    example: 'opaque_refresh_token_example',
  })
  refreshToken: string;
}
