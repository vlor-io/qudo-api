import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 입력 항목입니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'password1234',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력 항목입니다.' })
  password: string;
}
