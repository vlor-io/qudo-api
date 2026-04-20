import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePresignedUrlDto {
  @ApiProperty({
    description: '원본 파일명',
    example: 'my_shot.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: '파일의 MIME 타입',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiPropertyOptional({
    description: '연결할 Todo 항목의 ID (있는 경우)',
    example: 'todo_98b50e2d',
  })
  @IsString()
  @IsOptional()
  todoId?: string;

  @ApiProperty({
    description: '워크스페이스(캠페인) ID',
    example: 'w7ba91ef',
  })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
