import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CampaignsService } from '@/campaigns/campaigns.service';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { WorkspaceCategory } from '@/workspaces/entities/workspace.entity';
import { TodosService } from '@/todos/todos.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly campaignsService: CampaignsService,
    private readonly workspacesService: WorkspacesService,
    private readonly todosService: TodosService,
    private readonly dataSource: DataSource,
  ) {}

  async apply(userId: string, campaignId: string, dto: CreateApplicationDto): Promise<Application> {
    // 1. 캠페인 존재 확인
    const campaign = await this.campaignsService.findOne(campaignId);

    // 2. 이미 신청했는지 확인
    const existing = await this.applicationRepository.findOne({
      where: { userId, campaignId },
    });
    if (existing) {
      throw new ConflictException('이미 신청한 캠페인입니다.');
    }

    // 3. 신청 생성
    const application = this.applicationRepository.create({
      userId,
      campaignId,
      note: dto.note,
      status: ApplicationStatus.APPLIED,
    });

    const saved = await this.applicationRepository.save(application);

    // 4. 캠페인 신청자 수 증가 (Denormalized)
    // 실제로는 트랜잭션 필요
    campaign.applicantsCount += 1;
    await this.campaignsService.update(campaign.advertiserId, campaign.id, { slots: campaign.slots }); // 임시 업데이트 로직

    return saved;
  }

  async findMyApplications(userId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { userId },
      relations: ['campaign'],
      order: { appliedAt: 'DESC' },
    });
  }

  async findApplicantsByCampaign(advertiserId: string, campaignId: string): Promise<Application[]> {
    const campaign = await this.campaignsService.findOne(campaignId);
    if (campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('본인의 캠페인 신청자만 조회할 수 있습니다.');
    }

    return this.applicationRepository.find({
      where: { campaignId },
      relations: ['user'],
      order: { appliedAt: 'DESC' },
    });
  }

  async selectApplicant(advertiserId: string, applicationId: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['campaign'],
    });

    if (!application) {
      throw new NotFoundException('신청 정보를 찾을 수 없습니다.');
    }

    if (application.campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('본인의 캠페인 신청자만 선정할 수 있습니다.');
    }

    if (application.status !== ApplicationStatus.APPLIED) {
      throw new ConflictException('이미 처리된 신청입니다.');
    }

    // 트랜잭션 처리
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 상태 변경
      application.status = ApplicationStatus.SELECTED;

      // 2. 워크스페이스 자동 생성
      const categoryMap = {
        'FOOD': WorkspaceCategory.FOOD,
        'PRODUCT': WorkspaceCategory.PRODUCT,
        'BEAUTY': WorkspaceCategory.PRODUCT, // 맵핑 필요
        'TRAVEL': WorkspaceCategory.TRAVEL,
        'LIFESTYLE': WorkspaceCategory.PRODUCT,
        'DETAIL_PAGE': WorkspaceCategory.DETAIL_PAGE,
      };

      const workspace = await this.workspacesService.create(application.userId, {
        title: application.campaign.title,

        category: categoryMap[application.campaign.category] || WorkspaceCategory.PRODUCT,
        location: application.campaign.location,
        campaignGuide: application.campaign.reward, // 가이드를 혜택 정보로 우선 채움
      });

      application.workspaceId = workspace.id;

      // 3. 투두 프리셋 적용
      if (application.campaign.todoPreset && application.campaign.todoPreset.length > 0) {
        for (const [index, label] of application.campaign.todoPreset.entries()) {
          await this.todosService.create(workspace.id, { label, order: index });
        }
      }

      const updated = await queryRunner.manager.save(application);
      await queryRunner.commitTransaction();
      return updated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectApplicant(advertiserId: string, applicationId: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['campaign'],
    });

    if (!application || application.campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    application.status = ApplicationStatus.REJECTED;
    return this.applicationRepository.save(application);
  }
}
