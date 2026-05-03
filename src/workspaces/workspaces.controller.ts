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
import { VerifyShareLinkDto } from './dto/verify-share-link.dto';
import { ParseCampaignGuideDto } from './dto/parse-campaign-guide.dto';
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
    summary: '공유 링크 메타 조회 (공개)',
    description: '공유 토큰의 메타 정보를 조회합니다. 비밀번호로 보호된 링크면 `passwordProtected:true`, `authenticated:false`, `workspace` 미포함으로 응답하고, 클라이언트는 비밀번호 입력 후 `/share/:token/verify` 를 호출해야 합니다. 보호되지 않은 링크면 즉시 워크스페이스 풀 데이터가 응답됩니다.',
  })
  @ApiResponse({ status: 200, description: '조회 성공' })
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
        message: '만료된 공유 링크입니다.',
      },
    },
  })
  @ApiPublicStandardErrors('/v1/workspaces/share/{token}')
  @Public()
  @Get('share/:token')
  async getShareLink(@Param('token') token: string) {
    const data = await this.workspacesService.getShareLinkInfo(token);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '공유 링크 비밀번호 검증 (공개)',
    description: '비밀번호로 보호된 공유 링크의 비밀번호를 검증합니다. 성공 시 `authenticated:true` + `workspace` 풀 데이터를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '검증 성공' })
  @ApiBadRequestError({
    path: '/v1/workspaces/share/{token}/verify',
    description: 'password 필드 누락',
    validationDetails: ['password should not be empty'],
  })
  @ApiResponse({
    status: 401,
    description: '비밀번호 불일치',
    content: {
      'application/json': {
        example: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: '비밀번호가 일치하지 않습니다.', details: null },
          timestamp: '2026-04-19T02:00:00.000Z',
          path: '/v1/workspaces/share/{token}/verify',
        },
      },
    },
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/share/{token}/verify',
    description: '링크가 존재하지 않거나 만료됨',
    message: '유효하지 않은 공유 링크입니다.',
  })
  @ApiPublicStandardErrors('/v1/workspaces/share/{token}/verify')
  @Public()
  @Post('share/:token/verify')
  @HttpCode(200)
  async verifyShareLink(@Param('token') token: string, @Body() dto: VerifyShareLinkDto) {
    const data = await this.workspacesService.verifyShareLink(token, dto.password);
    return { success: true, data };
  }

  @ApiOperation({
    summary: '캠페인 가이드 텍스트 자동 분석',
    description: '광고주가 전달한 캠페인 가이드 원문을 Gemini 로 분석해 촬영 투두·마감일·법적 고지를 추출합니다. `applyTodos:true` (기본) 면 추출된 투두를 워크스페이스에 즉시 추가하고 `appliedTodoIds` 에 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '분석 성공',
    content: {
      'application/json': {
        example: {
          success: true,
          data: {
            todos: [
              { label: '매장 외관 정면', required: true },
              { label: '메뉴판 전체 컷', required: true },
            ],
            deadline: '2026-06-01',
            legalNotices: ['#광고 표기 필수'],
            summary: '맛집 체험단 — 외관·메뉴판·메인 메뉴 클로즈업 필수',
            appliedTodoIds: ['uuid-1', 'uuid-2'],
          },
        },
      },
    },
  })
  @ApiBadRequestError({
    path: '/v1/workspaces/{id}/parse-campaign',
    description: '입력값 오류',
    validationDetails: ['text should not be empty'],
  })
  @ApiNotFoundError({
    path: '/v1/workspaces/{id}/parse-campaign',
    description: '워크스페이스가 존재하지 않음',
    message: WS_NOT_FOUND_MSG,
  })
  @ApiStandardErrors('/v1/workspaces/{id}/parse-campaign')
  @Post(':id/parse-campaign')
  @HttpCode(200)
  async parseCampaignGuide(@Request() req: any, @Param('id') workspaceId: string, @Body() dto: ParseCampaignGuideDto) {
    const data = await this.workspacesService.parseCampaignGuide(
      req.user.id,
      workspaceId,
      dto.text,
      dto.applyTodos !== false,
    );
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
