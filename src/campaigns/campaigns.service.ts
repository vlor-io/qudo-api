import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus, CampaignType, CampaignCategory } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async findAll(query: {
    type?: CampaignType;
    category?: CampaignCategory;
    status?: CampaignStatus;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { type, category, status = CampaignStatus.RECRUITING, q, page = 1, pageSize = 20 } = query;

    const qb = this.campaignRepository.createQueryBuilder('campaign');

    qb.where('campaign.status = :status', { status });

    if (type) {
      qb.andWhere('campaign.type = :type', { type });
    }

    if (category) {
      qb.andWhere('campaign.category = :category', { category });
    }

    if (q) {
      qb.andWhere('(campaign.title LIKE :q OR campaign.brand LIKE :q)', { q: `%${q}%` });
    }

    const [items, totalCount] = await qb
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
      },
    };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('해당 캠페인을 찾을 수 없습니다.');
    }
    return campaign;
  }

  async create(advertiserId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignRepository.create({
      ...dto,
      advertiserId,
      status: CampaignStatus.RECRUITING,
      applicantsCount: 0,
    });
    return this.campaignRepository.save(campaign);
  }

  async findByAdvertiser(advertiserId: string): Promise<Campaign[]> {
    return this.campaignRepository.find({
      where: { advertiserId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(advertiserId: string, id: string, dto: Partial<CreateCampaignDto>): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('본인의 캠페인만 수정할 수 있습니다.');
    }
    Object.assign(campaign, dto);
    return this.campaignRepository.save(campaign);
  }

  async remove(advertiserId: string, id: string): Promise<void> {
    const campaign = await this.findOne(id);
    if (campaign.advertiserId !== advertiserId) {
      throw new ForbiddenException('본인의 캠페인만 삭제할 수 있습니다.');
    }
    // 실제 운영 시에는 신청자가 있을 경우 삭제 불가 로직 필요
    await this.campaignRepository.softDelete(id);
  }
}
