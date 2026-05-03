import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Workspace, WorkspaceStatus } from './entities/workspace.entity';
import { ShareLink } from './entities/share-link.entity';
import { SignatureShot } from './entities/signature-shot.entity';
import { Todo, TodoStatus } from '@/todos/entities/todo.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { AiService, ParsedCampaignGuide } from '@/ai/ai.service';
import { TodosService } from '@/todos/todos.service';

/** 공유 링크 외부 노출용 응답 — passwordHash 등 민감 필드 제외. */
export interface ShareLinkPublicView {
  token: string;
  workspaceId: string;
  passwordProtected: boolean;
  authenticated: boolean;
  expiresAt: Date | null;
  viewCount: number;
  createdAt: Date;
  workspace?: Workspace;
}

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(SignatureShot)
    private readonly signatureShotRepository: Repository<SignatureShot>,
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
    private readonly aiService: AiService,
    private readonly todosService: TodosService,
  ) {}

  async findAll(userId: string, status?: WorkspaceStatus): Promise<Workspace[]> {
    const query = this.workspaceRepository.createQueryBuilder('workspace')
      .where('workspace.userId = :userId', { userId });

    if (status) {
      query.andWhere('workspace.status = :status', { status });
    }

    return query.orderBy('workspace.createdAt', 'DESC').getMany();
  }

  async findOne(userId: string, id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id, userId },
    });

    if (!workspace) {
      throw new NotFoundException('해당 워크스페이스를 찾을 수 없습니다.');
    }

    return workspace;
  }

  async create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = this.workspaceRepository.create({
      ...dto,
      userId,
      status: WorkspaceStatus.ACTIVE,
      progress: 0,
    });

    return this.workspaceRepository.save(workspace);
  }

  async updateStatus(userId: string, id: string, status: WorkspaceStatus): Promise<Workspace> {
    const workspace = await this.findOne(userId, id);
    workspace.status = status;
    return this.workspaceRepository.save(workspace);
  }

  async remove(userId: string, id: string): Promise<void> {
    const workspace = await this.findOne(userId, id);
    await this.workspaceRepository.softDelete(workspace.id);
  }

  async createShareLink(userId: string, workspaceId: string, dto: CreateShareLinkDto): Promise<ShareLink> {
    const workspace = await this.findOne(userId, workspaceId);

    const token = Math.random().toString(36).substring(2, 10);

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (dto.expiresInHours || 72));

    const shareLink = this.shareLinkRepository.create({
      workspaceId: workspace.id,
      token,
      passwordHash,
      expiresAt,
    });

    return this.shareLinkRepository.save(shareLink);
  }

  /**
   * 공유 링크 메타 조회. **passwordHash 는 절대 노출하지 않음.**
   * 비밀번호가 걸려 있으면 `authenticated:false` + `workspace:undefined` 로 반환.
   * 비밀번호 없으면 즉시 `authenticated:true` + workspace 풀 데이터.
   */
  async getShareLinkInfo(token: string, alreadyAuthenticated = false): Promise<ShareLinkPublicView> {
    const shareLink = await this.loadValidShareLink(token);

    const passwordProtected = !!shareLink.passwordHash;
    const authenticated = !passwordProtected || alreadyAuthenticated;

    if (authenticated) {
      // 조회수 증가는 인증된 접근 시에만 카운트
      await this.shareLinkRepository.increment({ id: shareLink.id }, 'viewCount', 1);
    }

    return {
      token: shareLink.token,
      workspaceId: shareLink.workspaceId,
      passwordProtected,
      authenticated,
      expiresAt: shareLink.expiresAt ?? null,
      viewCount: shareLink.viewCount + (authenticated ? 1 : 0),
      createdAt: shareLink.createdAt,
      workspace: authenticated ? shareLink.workspace : undefined,
    };
  }

  /**
   * 비밀번호 검증. 성공 시 인증된 정보(`authenticated:true` + workspace) 반환.
   * 실패 시 401.
   */
  async verifyShareLink(token: string, password: string): Promise<ShareLinkPublicView> {
    const shareLink = await this.loadValidShareLink(token);

    if (!shareLink.passwordHash) {
      // 비밀번호가 걸려 있지 않은 링크인데 검증 호출됨 → 그대로 인증된 응답
      return this.getShareLinkInfo(token, true);
    }

    const ok = await bcrypt.compare(password, shareLink.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    return this.getShareLinkInfo(token, true);
  }

  private async loadValidShareLink(token: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token },
      relations: ['workspace', 'workspace.user'],
    });

    if (!shareLink) {
      throw new NotFoundException('유효하지 않은 공유 링크입니다.');
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new NotFoundException('만료된 공유 링크입니다.');
    }

    return shareLink;
  }

  async findSignatureShots(userId: string, workspaceId: string): Promise<SignatureShot[]> {
    const workspace = await this.findOne(userId, workspaceId);
    return this.signatureShotRepository.find({
      where: { workspaceId: workspace.id },
      order: { order: 'ASC' },
    });
  }

  /**
   * 워크스페이스의 진행률(%) 을 재계산해 DB 에 저장.
   */
  async recalculateProgress(workspaceId: string): Promise<void> {
    const total = await this.todoRepository.count({ where: { workspaceId } });
    if (total === 0) return;

    const completed = await this.todoRepository.count({
      where: { workspaceId, status: TodoStatus.COMPLETED },
    });

    const progress = Math.round((completed / total) * 100);

    await this.workspaceRepository.update(workspaceId, { progress });
  }

  /**
   * 캠페인 가이드 텍스트를 AI 로 분석해 todo 배열·마감·법적 고지를 추출.
   * applyTodos=true (default) 면 추출된 todo 를 즉시 워크스페이스에 추가.
   */
  async parseCampaignGuide(
    userId: string,
    workspaceId: string,
    text: string,
    applyTodos: boolean,
  ): Promise<ParsedCampaignGuide & { appliedTodoIds: string[] }> {
    const workspace = await this.findOne(userId, workspaceId);

    const parsed = await this.aiService.parseCampaignGuide(text);

    const appliedTodoIds: string[] = [];
    if (applyTodos && parsed.todos.length > 0) {
      const existingCount = await this.todoRepository.count({ where: { workspaceId: workspace.id } });
      for (const [index, t] of parsed.todos.entries()) {
        const created = await this.todosService.create(workspace.id, {
          label: t.label,
          order: existingCount + index,
        });
        appliedTodoIds.push(created.id);
      }
      // 진행률 재계산 (추가된 todo 가 있으니 분모 변경)
      await this.recalculateProgress(workspace.id);
    }

    return { ...parsed, appliedTodoIds };
  }
}
