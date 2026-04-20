import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Workspace, WorkspaceStatus } from './entities/workspace.entity';
import { ShareLink } from './entities/share-link.entity';
import { SignatureShot } from './entities/signature-shot.entity';
import { Todo, TodoStatus } from '@/todos/entities/todo.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';

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

    const saved = await this.workspaceRepository.save(workspace);
    
    // TODO: todoPreset이 있으면 Todo 항목들도 생성해야 함 (Todo 모듈 구현 시 추가)
    
    return saved;
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

    // 1. 토큰 생성 (8자 랜덤 문자열)
    const token = Math.random().toString(36).substring(2, 10);

    // 2. 비밀번호 해싱 (있는 경우)
    let passwordHash = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // 3. 만료일 설정
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

  async getShareLink(token: string): Promise<ShareLink> {
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

    // 조회수 증가
    shareLink.viewCount += 1;
    await this.shareLinkRepository.save(shareLink);

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
   * 워크스페이스의 진행률(% )을 재계산합니다.
   * 투두 총 개수 대비 완료된 개수의 비율을 계산하여 DB에 저장합니다.
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
}
