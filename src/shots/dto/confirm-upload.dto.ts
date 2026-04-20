import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ConfirmUploadDto {
  @ApiProperty({ description: '업로드된 파일의 객체 키 (S3 Key)', example: 'shots/user-id/todo-id_random_filename.jpg' })
  @IsString()
  @IsNotEmpty()
  objectKey: string;

  @ApiProperty({ description: '연관된 투두 항목 ID', example: 't1ba91ef-158d-43a2-a441-c7e5b7578642' })
  @IsUUID()
  @IsNotEmpty()
  todoId: string;

  @ApiProperty({ description: '연관된 워크스페이스 ID', example: 'w7ba91ef-158d-43a2-a441-c7e5b7578642' })
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;
}
