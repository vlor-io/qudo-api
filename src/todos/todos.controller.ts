import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TodosService } from './todos.service';
import { Todo } from './entities/todo.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiNotFoundError,
} from '@/common/decorators/api-standard-errors.decorator';

const TODO_NOT_FOUND_MSG = '해당 투두 항목을 찾을 수 없습니다.';

@ApiTags('Todos (투두/촬영항목)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @ApiOperation({
    summary: '투두 상태 토글',
    description: '투두 항목의 상태를 PENDING ↔ COMPLETED 사이로 전환합니다.',
  })
  @ApiResponse({ status: 200, description: '상태 변경 성공', type: Todo })
  @ApiNotFoundError({
    path: '/v1/todos/{id}/toggle',
    description: '투두 항목이 존재하지 않음',
    message: TODO_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/todos/{id}/toggle')
  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const data = await this.todosService.toggleStatus(id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '투두 항목 수정',
    description: '투두 항목의 제목이나 상태 등을 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정 성공', type: Todo })
  @ApiBadRequestError({
    path: '/v1/todos/{id}',
    description: '입력값 오류',
    validationDetails: ['label should not be empty'],
  })
  @ApiNotFoundError({
    path: '/v1/todos/{id}',
    description: '투두 항목이 존재하지 않음',
    message: TODO_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/todos/{id}')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Todo>) {
    const data = await this.todosService.update(id, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '투두 항목 삭제',
    description: '특정 투두 항목을 영구 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiNotFoundError({
    path: '/v1/todos/{id}',
    description: '투두 항목이 존재하지 않음',
    message: TODO_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/todos/{id}')
  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.todosService.remove(id);
    return { success: true, data: null };
  }
}
