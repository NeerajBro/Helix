import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CampaignDto, CampaignRecipientDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { CAMPAIGN_QUEUE } from '../../infrastructure/queue/queue.module';
import { CampaignJobData } from './campaign.processor';
import { CreateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly campaignQueue: Queue<CampaignJobData>,
  ) {}

  async findAll(): Promise<CampaignDto[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { deletedAt: null },
      include: { template: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns.map((c) => this.mapCampaign(c));
  }

  async findOne(id: string): Promise<CampaignDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: { template: { select: { name: true } } },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return this.mapCampaign(campaign);
  }

  async getRecipients(campaignId: string): Promise<CampaignRecipientDto[]> {
    await this.findOne(campaignId);
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    });
    return recipients.map((r) => ({
      id: r.id,
      phone: r.phone,
      status: r.status,
      sentAt: r.sentAt?.toISOString(),
      deliveredAt: r.deliveredAt?.toISOString(),
      errorMessage: r.errorMessage ?? undefined,
    }));
  }

  async create(dto: CreateCampaignDto, userId?: string): Promise<CampaignDto> {
    if (!dto.recipients.length) {
      throw new BadRequestException('At least one recipient is required');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        templateId: dto.templateId,
        whatsAppNumberId: dto.whatsAppNumberId,
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        totalRecipients: dto.recipients.length,
        recipients: {
          create: dto.recipients.map((r) => ({
            phone: r.phone,
            variables: r.variables ?? {},
          })),
        },
      },
      include: { template: { select: { name: true } } },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entityType: 'campaign',
      entityId: campaign.id,
      newValues: { name: campaign.name, recipients: dto.recipients.length },
    });

    return this.mapCampaign(campaign);
  }

  async start(id: string, userId?: string): Promise<CampaignDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: { recipients: true, template: { select: { name: true } } },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot start campaign in status ${campaign.status}`);
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    for (const recipient of campaign.recipients) {
      await this.campaignQueue.add(
        'send',
        { campaignId: id, recipientId: recipient.id },
        { removeOnComplete: 100, removeOnFail: 50 },
      );
    }

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'campaign',
      entityId: id,
      newValues: { action: 'start', recipients: campaign.recipients.length },
    });

    return this.findOne(id);
  }

  async cancel(id: string, userId?: string): Promise<CampaignDto> {
    const campaign = await this.findOne(id);
    if (!['DRAFT', 'SCHEDULED', 'RUNNING'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot cancel campaign in status ${campaign.status}`);
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'campaign',
      entityId: id,
      newValues: { action: 'cancel' },
    });

    return this.findOne(id);
  }

  private mapCampaign(c: {
    id: string;
    name: string;
    templateId: string | null;
    whatsAppNumberId: string | null;
    status: string;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    createdAt: Date;
    updatedAt: Date;
    template?: { name: string } | null;
  }): CampaignDto {
    return {
      id: c.id,
      name: c.name,
      templateId: c.templateId ?? undefined,
      templateName: c.template?.name,
      whatsAppNumberId: c.whatsAppNumberId ?? undefined,
      status: c.status as CampaignDto['status'],
      scheduledAt: c.scheduledAt?.toISOString(),
      startedAt: c.startedAt?.toISOString(),
      completedAt: c.completedAt?.toISOString(),
      totalRecipients: c.totalRecipients,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      failedCount: c.failedCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
