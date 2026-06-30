import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConversationPriority } from '@prisma/client';
import { SalesforceCaseDto, SalesforceSyncStatus } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SALESFORCE_ADAPTER, SalesforceAdapter } from '../../adapters/salesforce/salesforce.adapter';

@Injectable()
export class SalesforceSyncService {
  private readonly logger = new Logger(SalesforceSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SALESFORCE_ADAPTER) private readonly salesforce: SalesforceAdapter,
  ) {}

  async syncOnCreate(conversationId: string): Promise<void> {
    await this.upsertCase(conversationId, {
      status: 'New',
      priority: 'Medium',
    });
  }

  async syncOnHandoff(conversationId: string): Promise<void> {
    const conversation = await this.loadConversation(conversationId);
    if (!conversation) return;

    const priority = this.mapPriority(conversation.priority);
    await this.upsertCase(conversationId, {
      status: 'Working',
      priority,
      subject: this.buildSubject(conversation),
      description: conversation.aiSummary ?? undefined,
    });
  }

  async syncOnAssign(conversationId: string): Promise<void> {
    await this.upsertCase(conversationId, { status: 'Working' });
  }

  async syncOnTransfer(conversationId: string): Promise<void> {
    await this.upsertCase(conversationId, { status: 'Escalated' });
  }

  async syncOnResolve(conversationId: string): Promise<void> {
    await this.upsertCase(conversationId, { status: 'Resolved' });
  }

  async syncOnClose(conversationId: string): Promise<void> {
    await this.upsertCase(conversationId, { status: 'Closed' });
  }

  mapCaseRecord(record: {
    id: string;
    conversationId: string;
    salesforceCaseId: string | null;
    caseNumber: string | null;
    subject: string | null;
    status: string | null;
    priority: string | null;
    syncStatus: string;
    lastSyncedAt: Date | null;
    syncError: string | null;
  }): SalesforceCaseDto {
    return {
      id: record.id,
      conversationId: record.conversationId,
      salesforceCaseId: record.salesforceCaseId ?? undefined,
      caseNumber: record.caseNumber ?? undefined,
      subject: record.subject ?? undefined,
      status: record.status ?? undefined,
      priority: record.priority ?? undefined,
      syncStatus: record.syncStatus as SalesforceSyncStatus,
      lastSyncedAt: record.lastSyncedAt?.toISOString(),
      syncError: record.syncError ?? undefined,
    };
  }

  private async upsertCase(
    conversationId: string,
    overrides: { status: string; priority?: string; subject?: string; description?: string },
  ): Promise<void> {
    const conversation = await this.loadConversation(conversationId);
    if (!conversation) return;

    const existing = await this.prisma.salesforceCase.findUnique({
      where: { conversationId },
    });

    const subject = overrides.subject ?? existing?.subject ?? this.buildSubject(conversation);
    const priority = overrides.priority ?? existing?.priority ?? this.mapPriority(conversation.priority);
    const payload = {
      conversationId,
      subject,
      description: overrides.description ?? conversation.aiSummary ?? undefined,
      status: overrides.status,
      priority,
      customerName: conversation.customer.name ?? undefined,
      customerPhone: conversation.customer.phone,
      customerEmail: conversation.customer.email ?? undefined,
      departmentName: conversation.department?.name,
      agentName: conversation.assignedAgent
        ? `${conversation.assignedAgent.firstName} ${conversation.assignedAgent.lastName}`
        : undefined,
      aiSummary: conversation.aiSummary ?? undefined,
    };

    try {
      let result;
      if (existing?.salesforceCaseId) {
        result = await this.salesforce.updateCase(existing.salesforceCaseId, payload);
      } else {
        result = await this.salesforce.createCase(payload);
      }

      await this.prisma.salesforceCase.upsert({
        where: { conversationId },
        create: {
          conversationId,
          salesforceCaseId: result.salesforceCaseId,
          caseNumber: result.caseNumber,
          subject: result.subject,
          status: result.status,
          priority: result.priority,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncError: null,
        },
        update: {
          salesforceCaseId: result.salesforceCaseId,
          caseNumber: result.caseNumber,
          subject: result.subject,
          status: result.status,
          priority: result.priority,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      this.logger.error(`Salesforce sync failed for ${conversationId}: ${message}`);
      await this.prisma.salesforceCase.upsert({
        where: { conversationId },
        create: {
          conversationId,
          subject,
          status: overrides.status,
          priority,
          syncStatus: 'FAILED',
          syncError: message,
        },
        update: {
          subject,
          status: overrides.status,
          priority,
          syncStatus: 'FAILED',
          syncError: message,
        },
      });
    }
  }

  private async loadConversation(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        customer: true,
        department: { select: { name: true } },
        assignedAgent: { select: { firstName: true, lastName: true } },
      },
    });
  }

  private buildSubject(conversation: {
    subject: string | null;
    customer: { name: string | null; phone: string };
    department: { name: string } | null;
  }): string {
    const customer = conversation.customer.name ?? conversation.customer.phone;
    const dept = conversation.department?.name ?? 'Support';
    return conversation.subject ?? `WhatsApp: ${customer} — ${dept}`;
  }

  private mapPriority(priority: ConversationPriority | string): string {
    switch (priority) {
      case 'URGENT':
        return 'Critical';
      case 'HIGH':
        return 'High';
      case 'LOW':
        return 'Low';
      default:
        return 'Medium';
    }
  }
}
