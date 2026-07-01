import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  WHATSAPP_ADAPTER,
  WhatsAppAdapter,
} from '../../adapters/whatsapp/whatsapp.adapter';
import { CAMPAIGN_QUEUE } from '../../infrastructure/queue/queue.module';

export interface CampaignJobData {
  campaignId: string;
  recipientId: string;
}

@Processor(CAMPAIGN_QUEUE)
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: WhatsAppAdapter,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, recipientId } = job.data;

    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        campaign: { include: { template: true } },
      },
    });

    if (!recipient || recipient.campaignId !== campaignId) return;
    if (recipient.status !== 'PENDING') return;

    const template = recipient.campaign.template;
    const variables = (recipient.variables as Record<string, string> | null) ?? {};

    try {
      let result;
      if (template) {
        const params = (Array.isArray(template.variables) ? template.variables : []).map(
          (v) => variables[String(v)] ?? String(v),
        );
        result = await this.whatsapp.sendTemplate(recipient.phone, {
          templateName: template.slug,
          language: template.language,
          parameters: params,
        });
      } else {
        result = await this.whatsapp.sendMessage(recipient.phone, {
          contentType: 'TEXT' as never,
          content: recipient.campaign.name,
        });
      }

      const now = new Date();
      const status = result.status === 'sent' ? 'SENT' : 'FAILED';

      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status,
          sentAt: status === 'SENT' ? now : undefined,
          deliveredAt: status === 'SENT' ? now : undefined,
          errorMessage: result.error,
        },
      });

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: status === 'SENT' ? 1 : 0 },
          deliveredCount: { increment: status === 'SENT' ? 1 : 0 },
          failedCount: { increment: status === 'FAILED' ? 1 : 0 },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed';
      this.logger.error(`Campaign recipient ${recipientId} failed: ${message}`);
      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED', errorMessage: message },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }

    await this.checkCampaignCompletion(campaignId);
  }

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const pending = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: 'PENDING' },
    });
    if (pending === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }
  }
}
