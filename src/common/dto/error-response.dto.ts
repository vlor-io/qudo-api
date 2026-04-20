import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetails {
  @ApiProperty({ description: '에러 구분 코드', example: 'UNAUTHORIZED' })
  code: string;

  @ApiProperty({ description: '에러 메시지 (사용자 노출용)', example: '로그인이 필요하거나 토큰이 만료되었습니다.' })
  message: string;

  @ApiProperty({ 
    description: '상세 에러 내용 (Validation 오류 등)', 
    example: ['email must be an email', 'password should not be empty'], 
    nullable: true 
  })
  details: any;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: ErrorDetails })
  error: ErrorDetails;

  @ApiProperty({ example: '2026-04-19T02:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/v1/users/me' })
  path: string;
}
