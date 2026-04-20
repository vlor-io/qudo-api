import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 입력 항목입니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호 (최소 6자 이상)',
    example: 'password1234',
    required: true,
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수 입력 항목입니다.' })
  password: string;

  @ApiProperty({
    description: '사용자 표시 이름',
    example: '김스냅',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력 항목입니다.' })
  displayName: string;
}
