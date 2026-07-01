import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AgentReportRow,
  BotReport,
  ConversationReportRow,
  CsatReport,
  DepartmentReportRow,
  ReportDateRange,
  ReportsBundle,
  ReportsSummary,
  SlaReport,
} from '@helix/types';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SlaService } from '../sla/sla.service';
import { ConversationReportQueryDto, ReportQueryDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slaService: SlaService,
  ) {}

  parseRange(query: ReportQueryDto): ReportDateRange {
    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = query.from ? new Date(query.from) : new Date(to);
    if (!query.from) {
      from.setDate(from.getDate() - 6);
    }
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  async getBundle(query: ReportQueryDto): Promise<ReportsBundle> {
    const range = this.parseRange(query);
    const from = new Date(range.from);
    const to = new Date(range.to);

    const [summary, departments, agents, bot, sla, csat] = await Promise.all([
      this.getSummary(from, to),
      this.getDepartmentReport(from, to),
      this.getAgentReport(from, to),
      this.getBotReport(from, to),
      this.getSlaReport(from, to),
      this.getCsatReport(from, to),
    ]);

    return { range, summary, departments, agents, bot, sla, csat };
  }

  async getSummary(from: Date, to: Date): Promise<ReportsSummary> {
    const baseWhere = {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
    };

    const [
      totalConversations,
      resolved,
      closed,
      slaBreached,
      botHandoffs,
      messagesTotal,
      csatAgg,
      firstResponseConversations,
      resolvedWithTimes,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: baseWhere }),
      this.prisma.conversation.count({
        where: { ...baseWhere, status: 'RESOLVED' },
      }),
      this.prisma.conversation.count({
        where: { ...baseWhere, status: 'CLOSED' },
      }),
      this.prisma.conversation.count({
        where: { ...baseWhere, slaBreached: true },
      }),
      this.prisma.conversation.count({
        where: { ...baseWhere, botTransferredAt: { not: null } },
      }),
      this.prisma.message.count({
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.csatSurvey.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.conversation.findMany({
        where: { ...baseWhere, firstResponseAt: { not: null } },
        select: { createdAt: true, firstResponseAt: true, botTransferredAt: true },
        take: 500,
      }),
      this.prisma.conversation.findMany({
        where: { ...baseWhere, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 500,
      }),
    ]);

    const avgFirstResponseMinutes = this.avgMinutes(
      firstResponseConversations,
      (c) => (c.botTransferredAt ?? c.createdAt),
      (c) => c.firstResponseAt!,
    );
    const avgResolutionMinutes = this.avgMinutes(
      resolvedWithTimes,
      (c) => c.createdAt,
      (c) => c.resolvedAt!,
    );

    const slaComplianceRate =
      totalConversations > 0
        ? Math.round(((totalConversations - slaBreached) / totalConversations) * 100)
        : 100;

    return {
      totalConversations,
      resolved,
      closed,
      avgFirstResponseMinutes,
      avgResolutionMinutes,
      slaComplianceRate,
      slaBreached,
      csatAverage: Math.round((csatAgg._avg.rating ?? 0) * 10) / 10,
      csatResponses: csatAgg._count.id,
      botHandoffRate:
        totalConversations > 0 ? Math.round((botHandoffs / totalConversations) * 100) : 0,
      messagesTotal,
    };
  }

  async getDepartmentReport(from: Date, to: Date): Promise<DepartmentReportRow[]> {
    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });

    const rows: DepartmentReportRow[] = [];
    for (const dept of departments) {
      const baseWhere = {
        deletedAt: null,
        departmentId: dept.id,
        createdAt: { gte: from, lte: to },
      };

      const [total, resolved, open, slaBreached, firstResponses, csatAgg] = await Promise.all([
        this.prisma.conversation.count({ where: baseWhere }),
        this.prisma.conversation.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
        this.prisma.conversation.count({
          where: { ...baseWhere, status: { in: ['OPEN', 'WAITING', 'PENDING', 'TRANSFERRED'] } },
        }),
        this.prisma.conversation.count({ where: { ...baseWhere, slaBreached: true } }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, firstResponseAt: { not: null } },
          select: { createdAt: true, firstResponseAt: true, botTransferredAt: true },
          take: 200,
        }),
        this.prisma.csatSurvey.aggregate({
          where: {
            createdAt: { gte: from, lte: to },
            conversation: { departmentId: dept.id },
          },
          _avg: { rating: true },
        }),
      ]);

      if (total === 0) continue;

      rows.push({
        departmentId: dept.id,
        departmentName: dept.name,
        total,
        resolved,
        open,
        avgFirstResponseMinutes: this.avgMinutes(
          firstResponses,
          (c) => c.botTransferredAt ?? c.createdAt,
          (c) => c.firstResponseAt!,
        ),
        slaBreached,
        csatAverage: csatAgg._avg.rating
          ? Math.round(csatAgg._avg.rating * 10) / 10
          : undefined,
      });
    }

    return rows.sort((a, b) => b.total - a.total);
  }

  async getAgentReport(from: Date, to: Date): Promise<AgentReportRow[]> {
    const agents = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { slug: { in: ['agent', 'supervisor'] } } } },
      },
      include: { department: { select: { name: true } } },
    });

    const rows: AgentReportRow[] = [];
    for (const agent of agents) {
      const baseWhere = {
        deletedAt: null,
        assignedAgentId: agent.id,
        createdAt: { gte: from, lte: to },
      };

      const [assigned, resolved, firstResponses, resolvedTimes, csatAgg] = await Promise.all([
        this.prisma.conversation.count({ where: baseWhere }),
        this.prisma.conversation.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, firstResponseAt: { not: null } },
          select: { createdAt: true, firstResponseAt: true, botTransferredAt: true },
          take: 200,
        }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, resolvedAt: { not: null } },
          select: { createdAt: true, resolvedAt: true },
          take: 200,
        }),
        this.prisma.csatSurvey.aggregate({
          where: { agentId: agent.id, createdAt: { gte: from, lte: to } },
          _avg: { rating: true },
        }),
      ]);

      if (assigned === 0) continue;

      rows.push({
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        departmentName: agent.department?.name,
        assigned,
        resolved,
        avgFirstResponseMinutes: this.avgMinutes(
          firstResponses,
          (c) => c.botTransferredAt ?? c.createdAt,
          (c) => c.firstResponseAt!,
        ),
        avgResolutionMinutes: this.avgMinutes(
          resolvedTimes,
          (c) => c.createdAt,
          (c) => c.resolvedAt!,
        ),
        csatAverage: csatAgg._avg.rating
          ? Math.round(csatAgg._avg.rating * 10) / 10
          : undefined,
      });
    }

    return rows.sort((a, b) => b.resolved - a.resolved);
  }

  async getConversationReport(query: ConversationReportQueryDto) {
    const range = this.parseRange(query);
    const from = new Date(range.from);
    const to = new Date(range.to);
    const { skip, take, page, pageSize } = parsePagination(query);

    const where = {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { phone: true, name: true } },
          department: { select: { name: true } },
          assignedAgent: { select: { firstName: true, lastName: true } },
          csatSurvey: { select: { rating: true } },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items: ConversationReportRow[] = conversations.map((c) => ({
      id: c.id,
      customerPhone: c.customer.phone,
      customerName: c.customer.name ?? undefined,
      status: c.status,
      departmentName: c.department?.name,
      agentName: c.assignedAgent
        ? `${c.assignedAgent.firstName} ${c.assignedAgent.lastName}`
        : undefined,
      botHandled: c.botHandled,
      slaBreached: c.slaBreached,
      firstResponseMinutes:
        c.firstResponseAt
          ? Math.round(
              (c.firstResponseAt.getTime() -
                (c.botTransferredAt ?? c.createdAt).getTime()) /
                60000,
            )
          : undefined,
      resolutionMinutes: c.resolvedAt
        ? Math.round((c.resolvedAt.getTime() - c.createdAt.getTime()) / 60000)
        : undefined,
      csatRating: c.csatSurvey?.rating,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString(),
    }));

    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async getBotReport(from: Date, to: Date): Promise<BotReport> {
    const baseWhere = {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
    };

    const [totalConversations, botHandled, handoffCount, handoffConversations] =
      await Promise.all([
        this.prisma.conversation.count({ where: baseWhere }),
        this.prisma.conversation.count({ where: { ...baseWhere, botHandled: true } }),
        this.prisma.conversation.count({
          where: { ...baseWhere, botTransferredAt: { not: null } },
        }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, botTransferredAt: { not: null } },
          select: { id: true, metadata: true },
          take: 300,
        }),
      ]);

    const intentCounts = new Map<string, number>();
    let totalMessagesBeforeHandoff = 0;

    for (const convo of handoffConversations) {
      const metadata = (convo.metadata as Prisma.JsonObject | null) ?? {};
      const botState = metadata['botState'] as Prisma.JsonObject | undefined;
      const intent = (botState?.['handoffIntent'] as string) ?? 'general';
      intentCounts.set(intent, (intentCounts.get(intent) ?? 0) + 1);

      const msgCount = await this.prisma.message.count({
        where: {
          conversationId: convo.id,
          deletedAt: null,
          createdAt: { lte: new Date() },
        },
      });
      totalMessagesBeforeHandoff += msgCount;
    }

    return {
      totalConversations,
      botHandled,
      handoffCount,
      handoffRate:
        totalConversations > 0 ? Math.round((handoffCount / totalConversations) * 100) : 0,
      avgMessagesBeforeHandoff:
        handoffCount > 0 ? Math.round(totalMessagesBeforeHandoff / handoffCount) : 0,
      intentBreakdown: [...intentCounts.entries()]
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getSlaReport(from: Date, to: Date): Promise<SlaReport> {
    const baseWhere = {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
    };

    const [totalEvaluated, breached, firstResponses, resolvedTimes, targets] =
      await Promise.all([
        this.prisma.conversation.count({ where: baseWhere }),
        this.prisma.conversation.count({ where: { ...baseWhere, slaBreached: true } }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, firstResponseAt: { not: null } },
          select: { createdAt: true, firstResponseAt: true, botTransferredAt: true },
          take: 500,
        }),
        this.prisma.conversation.findMany({
          where: { ...baseWhere, resolvedAt: { not: null } },
          select: { createdAt: true, resolvedAt: true },
          take: 500,
        }),
        this.slaService.getTargets(),
      ]);

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });

    const byDepartment = await Promise.all(
      departments.map(async (d) => {
        const [deptTotal, deptBreached] = await Promise.all([
          this.prisma.conversation.count({
            where: { ...baseWhere, departmentId: d.id },
          }),
          this.prisma.conversation.count({
            where: { ...baseWhere, departmentId: d.id, slaBreached: true },
          }),
        ]);
        return { departmentName: d.name, breached: deptBreached, total: deptTotal };
      }),
    );

    const recentBreaches = await this.slaService.getRecentBreaches(15, from, to);

    return {
      totalEvaluated,
      breached,
      complianceRate:
        totalEvaluated > 0
          ? Math.round(((totalEvaluated - breached) / totalEvaluated) * 100)
          : 100,
      avgFirstResponseMinutes: this.avgMinutes(
        firstResponses,
        (c) => c.botTransferredAt ?? c.createdAt,
        (c) => c.firstResponseAt!,
      ),
      avgResolutionMinutes: this.avgMinutes(
        resolvedTimes,
        (c) => c.createdAt,
        (c) => c.resolvedAt!,
      ),
      firstResponseTargetMinutes: targets.firstResponseMinutes,
      resolutionTargetMinutes: targets.resolutionMinutes,
      byDepartment: byDepartment.filter((d) => d.total > 0).sort((a, b) => b.breached - a.breached),
      recentBreaches,
    };
  }

  async getCsatReport(from: Date, to: Date): Promise<CsatReport> {
    const [agg, surveys, agents] = await Promise.all([
      this.prisma.csatSurvey.groupBy({
        by: ['rating'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      this.prisma.csatSurvey.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          agent: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.csatSurvey.groupBy({
        by: ['agentId'],
        where: { createdAt: { gte: from, lte: to }, agentId: { not: null } },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const totalResponses = agg.reduce((sum, r) => sum + r._count.id, 0);
    const weightedSum = agg.reduce((sum, r) => sum + r.rating * r._count.id, 0);
    const averageRating = totalResponses > 0 ? Math.round((weightedSum / totalResponses) * 10) / 10 : 0;

    const agentIds = agents.map((a) => a.agentId).filter(Boolean) as string[];
    const agentUsers = await this.prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const agentMap = new Map(agentUsers.map((a) => [a.id, a]));

    return {
      averageRating,
      totalResponses,
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: agg.find((r) => r.rating === rating)?._count.id ?? 0,
      })),
      byAgent: agents
        .filter((a) => a.agentId)
        .map((a) => {
          const user = agentMap.get(a.agentId!);
          return {
            agentId: a.agentId!,
            agentName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            average: Math.round((a._avg.rating ?? 0) * 10) / 10,
            count: a._count.id,
          };
        })
        .sort((a, b) => b.average - a.average),
      recent: surveys.map((s) => ({
        id: s.id,
        conversationId: s.conversationId,
        customerId: s.customerId,
        agentId: s.agentId ?? undefined,
        agentName: s.agent
          ? `${s.agent.firstName} ${s.agent.lastName}`
          : undefined,
        customerName: s.customer.name ?? undefined,
        rating: s.rating,
        comment: s.comment ?? undefined,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  private avgMinutes<T>(
    items: T[],
    startFn: (item: T) => Date,
    endFn: (item: T) => Date,
  ): number {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => {
      const diff = endFn(item).getTime() - startFn(item).getTime();
      return sum + diff / 60000;
    }, 0);
    return Math.round(total / items.length);
  }
}
