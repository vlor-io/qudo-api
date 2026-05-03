import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyShareLinkDto {
  @ApiProperty({
    description: '공유 링크 생성 시 설정된 비밀번호',
    example: 'qudo1234',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
