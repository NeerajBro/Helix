import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SlaBreachAlert } from '@helix/types';
import { SOCKET_EVENTS } from '@helix/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';

interface SlaTargets {
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

@Injectable()
export class SlaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaService.name);
  private checkInterval?: ReturnType<typeof setInterval>;
  private defaultTargets: SlaTargets = { firstResponseMinutes: 15, resolutionMinutes: 240 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit(): void {
    void this.loadDefaultTargets();
    this.checkInterval = setInterval(() => {
      void this.evaluateActiveConversations();
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  async getTargets(queueId?: string | null): Promise<SlaTargets> {
    if (queueId) {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        select: { slaFirstResponse: true, slaResolution: true },
      });
      if (queue) {
        return {
          firstResponseMinutes: queue.slaFirstResponse ?? this.defaultTargets.firstResponseMinutes,
          resolutionMinutes: queue.slaResolution ?? this.defaultTargets.resolutionMinutes,
        };
      }
    }
    return this.defaultTargets;
  }

  async checkConversation(conversationId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        customer: true,
        department: { select: { name: true } },
        queue: { select: { id: true } },
      },
    });
    if (!conversation) return false;

    const breach = await this.evaluateConversation(conversation);
    if (breach && !conversation.slaBreached) {
      await this.markBreached(conversation, breach);
      return true;
    }
    return conversation.slaBreached;
  }

  async evaluateActiveConversations(): Promise<void> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        slaBreached: false,
        status: { in: ['OPEN', 'WAITING', 'PENDING', 'TRANSFERRED'] },
      },
      include: {
        customer: true,
        department: { select: { name: true } },
        queue: { select: { id: true } },
      },
      take: 200,
    });

    for (const conversation of conversations) {
      const breach = await this.evaluateConversation(conversation);
      if (breach) {
        await this.markBreached(conversation, breach);
      }
    }
  }

  async getRecentBreaches(limit = 20, from?: Date, to?: Date): Promise<SlaBreachAlert[]> {
    const where = {
      deletedAt: null,
      slaBreached: true,
      ...(from || to
        ? {
            updatedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        customer: true,
        department: { select: { name: true } },
        queue: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const alerts: SlaBreachAlert[] = [];
    for (const c of conversations) {
      const breach = await this.evaluateConversation(c);
      if (breach) {
        alerts.push({
          conversationId: c.id,
          customerPhone: c.customer.phone,
          customerName: c.customer.name ?? undefined,
          departmentName: c.department?.name,
          breachType: breach.type,
          breachedAt: new Date().toISOString(),
          minutesOverdue: breach.minutesOverdue,
        });
      }
    }
    return alerts;
  }

  private async evaluateConversation(conversation: {
    id: string;
    createdAt: Date;
    botTransferredAt: Date | null;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    queue: { id: string } | null;
  }): Promise<{ type: 'FIRST_RESPONSE' | 'RESOLUTION'; minutesOverdue: number } | null> {
    const targets = await this.getTargets(conversation.queue?.id);
    const now = Date.now();
    const startAt = conversation.botTransferredAt ?? conversation.createdAt;
    const elapsedMinutes = (now - startAt.getTime()) / 60000;

    if (!conversation.firstResponseAt && elapsedMinutes > targets.firstResponseMinutes) {
      return {
        type: 'FIRST_RESPONSE',
        minutesOverdue: Math.round(elapsedMinutes - targets.firstResponseMinutes),
      };
    }

    if (!conversation.resolvedAt && elapsedMinutes > targets.resolutionMinutes) {
      return {
        type: 'RESOLUTION',
        minutesOverdue: Math.round(elapsedMinutes - targets.resolutionMinutes),
      };
    }

    return null;
  }

  private async markBreached(
    conversation: {
      id: string;
      departmentId: string | null;
      assignedAgentId: string | null;
      customer: { phone: string; name: string | null };
      department: { name: string } | null;
    },
    breach: { type: 'FIRST_RESPONSE' | 'RESOLUTION'; minutesOverdue: number },
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { slaBreached: true },
    });

    const alert: SlaBreachAlert = {
      conversationId: conversation.id,
      customerPhone: conversation.customer.phone,
      customerName: conversation.customer.name ?? undefined,
      departmentName: conversation.department?.name,
      breachType: breach.type,
      breachedAt: new Date().toISOString(),
      minutesOverdue: breach.minutesOverdue,
    };

    await this.notifySupervisors(conversation, alert);
    this.realtime.emitSlaBreach(alert, conversation.departmentId, conversation.assignedAgentId);
    await this.realtime.refreshDashboardStats();
    this.logger.warn(`SLA breach: ${conversation.id} (${breach.type})`);
  }

  private async notifySupervisors(
    conversation: { id: string; departmentId: string | null },
    alert: SlaBreachAlert,
  ): Promise<void> {
    const supervisors = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { slug: { in: ['supervisor', 'admin', 'super-admin'] } } } },
        ...(conversation.departmentId ? { departmentId: conversation.departmentId } : {}),
      },
      select: { id: true },
      take: 20,
    });

    if (!supervisors.length) return;

    await this.prisma.notification.createMany({
      data: supervisors.map((u) => ({
        userId: u.id,
        type: 'SLA_BREACH' as const,
        title: 'SLA Breach',
        message: `${alert.breachType === 'FIRST_RESPONSE' ? 'First response' : 'Resolution'} SLA breached for ${alert.customerPhone}`,
        data: alert as unknown as Prisma.InputJsonValue,
      })),
    });

    for (const u of supervisors) {
      this.realtime.emitToAgent(u.id, SOCKET_EVENTS.NOTIFICATION_NEW, {
        type: 'SLA_BREACH',
        title: 'SLA Breach',
        message: `${alert.breachType === 'FIRST_RESPONSE' ? 'First response' : 'Resolution'} SLA breached for ${alert.customerPhone}`,
        data: alert,
      });
    }
  }

  private async loadDefaultTargets(): Promise<void> {
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: ['sla.first_response_minutes', 'sla.resolution_minutes'] } },
    });
    for (const s of settings) {
      const val = Number(s.value);
      if (s.key === 'sla.first_response_minutes' && !Number.isNaN(val)) {
        this.defaultTargets.firstResponseMinutes = val;
      }
      if (s.key === 'sla.resolution_minutes' && !Number.isNaN(val)) {
        this.defaultTargets.resolutionMinutes = val;
      }
    }
  }
}
