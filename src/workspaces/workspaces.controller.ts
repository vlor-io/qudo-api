import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { Workspace, WorkspaceStatus } from './entities/workspace.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { TodosService } from '@/todos/todos.service';
import { CreateTodoDto } from '@/todos/dto/create-todo.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { Todo } from '@/todos/entities/todo.entity';
import { ShareLink } from './entities/share-link.entity';
import { SignatureShot } from './entities/signature-shot.entity';
import {
  ApiStandardErrors,
  ApiBadRequestError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiPublicStandardErrors,
} from '@/common/decorators/api-standard-errors.decorator';

const WS_NOT_FOUND_MSG = '해당 워크스페이스를 찾을 수 없습니다.';
const WS_FORBIDDEN_MSG = '해당 워크스페이스에 대한 접근 권한이 없습니다.';

@ApiTags('Workspaces (워크스페이스)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly todosService: TodosService,
  ) {}

  @ApiOperation({
    summary: '워크스페이스 목록 조회',
    description: '내 워크스페이스 전체 또는 상태(status) 필터링하여 조회합니다.',
  })
  @ApiQuery({ name: 'status', enum: WorkspaceStatus, required: false })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Workspace] })
  @ApiStandardErrors('/v1/workspaces')
  @Get()
  async findAll(@Request() req: any, @Query('status') status?: WorkspaceStatus) {
    const data = await this.workspacesService.findAll(req.user.id, status);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '워크스페이스 상세 조회',
    description: '특정 워크스페이스의 상세 정보를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: Workspace })
  @ApiForbiddenError({
    path: '/v1/workspaces/{id}',
    description: '내 워크스페이스가 아님',
    message: WS_FORBIDDEN_MSG,
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}')
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const data = await this.workspacesService.findOne(req.user.id, id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '워크스페이스 생성',
    description: '새로운 촬영 워크스페이스를 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '생성 성공', type: Workspace })
  @ApiBadRequestError({
    path: '/v1/workspaces',
    description: '입력값 오류',
    cases: {
      '제목 누락': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['title should not be empty'],
      },
      '잘못된 카테고리': {
        code: 'BAD_REQUEST',
        message: 'Validation Failed',
        details: ['category must be a valid enum value'],
      },
    },
  })
  @ApiStandardErrors('/v1/workspaces')
  @Post()
  async create(@Request() req: any, @Body() dto: CreateWorkspaceDto) {
    const data = await this.workspacesService.create(req.user.id, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '워크스페이스 상태 변경',
    description: '워크스페이스 상태를 ACTIVE, COMPLETED, ARCHIVED 중 하나로 변경합니다.',
  })
  @ApiResponse({ status: 200, description: '상태 변경 성공', type: Workspace })
  @ApiBadRequestError({
    path: '/v1/workspaces/{id}/status',
    description: '유효하지 않은 상태값',
    cases: {
      '허용되지 않는 status': {
        code: 'BAD_REQUEST',
        message: '유효하지 않은 워크스페이스 상태값입니다. (ACTIVE | COMPLETED | ARCHIVED)',
      },
    },
  })
  @ApiForbiddenError({
    path: '/v1/workspaces/{id}/status',
    description: '내 워크스페이스가 아님',
    message: WS_FORBIDDEN_MSG,
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/status',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/status')
  @Patch(':id/status')
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: WorkspaceStatus) {
    const data = await this.workspacesService.updateStatus(req.user.id, id, status);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '워크스페이스 삭제',
    description: '워크스페이스를 소프트 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiForbiddenError({
    path: '/v1/workspaces/{id}',
    description: '내 워크스페이스가 아님',
    message: WS_FORBIDDEN_MSG,
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}')
  @Delete(':id')
  @HttpCode(200)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.workspacesService.remove(req.user.id, id);
    return { success: true, data: null };
  }

  @ApiOperation({
    summary: '워크스페이스 내 투두 목록 조회',
    description: '특정 워크스페이스에 속한 모든 투두 항목을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [Todo] })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/todos',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/todos')
  @Get(':id/todos')
  async findAllTodos(@Param('id') id: string) {
    const data = await this.todosService.findAllByWorkspace(id);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '워크스페이스 내 투두 추가',
    description: '특정 워크스페이스에 새로운 투두 항목을 추가합니다.',
  })
  @ApiResponse({ status: 201, description: '추가 성공', type: Todo })
  @ApiBadRequestError({
    path: '/v1/workspaces/{id}/todos',
    description: '입력값 오류',
    validationDetails: ['label should not be empty'],
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/todos',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/todos')
  @Post(':id/todos')
  async createTodo(@Param('id') id: string, @Body() dto: CreateTodoDto) {
    const data = await this.todosService.create(id, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '외부 공유 링크 생성',
    description: '워크스페이스를 외부에 공유할 수 있는 임시 링크를 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '생성 성공', type: ShareLink })
  @ApiBadRequestError({
    path: '/v1/workspaces/{id}/share',
    description: '입력값 오류 (만료일 형식 등)',
    validationDetails: ['expiresAt must be a valid ISO 8601 date string'],
  })
  @ApiForbiddenError({
    path: '/v1/workspaces/{id}/share',
    description: '내 워크스페이스가 아님',
    message: WS_FORBIDDEN_MSG,
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/share',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/share')
  @Post(':id/share')
  async createShareLink(@Request() req: any, @Param('id') workspaceId: string, @Body() dto: CreateShareLinkDto) {
    const data = await this.workspacesService.createShareLink(req.user.id, workspaceId, dto);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '공유 링크로 워크스페이스 조회 (공개)',
    description: '공유 토큰으로 워크스페이스 정보를 조회합니다. 비로그인 접근 가능.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: ShareLink })
  @ApiNotFoundError({
    path: '/v1/workspaces/share/{token}',
    description: '링크가 존재하지 않거나 만료됨',
    cases: {
      '링크 없음': {
        code: 'NOT_FOUND',
        message: '유효하지 않은 공유 링크입니다.',
      },
      '링크 만료': {
        code: 'NOT_FOUND',
        message: '공유 링크가 만료되었습니다.',
      },
    },
  })
  @ApiPublicStandardErrors('/v1/workspaces/share/{token}')
  @Public()
  @Get('share/:token')
  async getShareLink(@Param('token') token: string) {
    const data = await this.workspacesService.getShareLink(token);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '시그니처 샷 목록 조회',
    description: '워크스페이스의 카메라 오버레이용 가이드 이미지 목록을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: [SignatureShot] })
  @ApiForbiddenError({
    path: '/v1/workspaces/{id}/signature-shots',
    description: '내 워크스페이스가 아님',
    message: WS_FORBIDDEN_MSG,
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/signature-shots',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/signature-shots')
  @Get(':id/signature-shots')
  async getSignatureShots(@Request() req: any, @Param('id') workspaceId: string) {
    const data = await this.workspacesService.findSignatureShots(req.user.id, workspaceId);
    return { success: true, data };
  }
}
