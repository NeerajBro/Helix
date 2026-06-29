import { Injectable } from '@nestjs/common';
import {
  AgentPerformance,
  DashboardAnalytics,
  DashboardStats,
  DashboardTrendPoint,
  DepartmentDistribution,
} from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      openConversations,
      waitingConversations,
      pendingConversations,
      resolvedToday,
      closedToday,
      slaBreached,
      departments,
      queues,
      messagesToday,
      availabilitySummary,
      totalAgents,
      avgFirstResponseMinutes,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { deletedAt: null, status: 'OPEN' },
      }),
      this.prisma.conversation.count({
        where: { deletedAt: null, status: 'WAITING' },
      }),
      this.prisma.conversation.count({
        where: { deletedAt: null, status: 'PENDING' },
      }),
      this.prisma.conversation.count({
        where: {
          deletedAt: null,
          status: 'RESOLVED',
          resolvedAt: { gte: startOfDay },
        },
      }),
      this.prisma.conversation.count({
        where: {
          deletedAt: null,
          status: 'CLOSED',
          closedAt: { gte: startOfDay },
        },
      }),
      this.prisma.conversation.count({
        where: {
          deletedAt: null,
          slaBreached: true,
          status: { in: ['OPEN', 'WAITING', 'PENDING', 'TRANSFERRED'] },
        },
      }),
      this.prisma.department.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.queue.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.message.count({
        where: { deletedAt: null, createdAt: { gte: startOfDay } },
      }),
      this.prisma.agentAvailability.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          roles: { some: { role: { slug: { in: ['agent', 'supervisor', 'admin'] } } } },
        },
      }),
      this.getAvgFirstResponseMinutes(),
    ]);

    const agentsOnline =
      availabilitySummary.find((s: { status: string; _count: { status: number } }) => s.status === 'ONLINE')
        ?._count.status ?? 0;

    return {
      openConversations,
      waitingConversations,
      pendingConversations,
      resolvedToday,
      closedToday,
      slaBreached,
      avgFirstResponseMinutes,
      agentsOnline,
      totalAgents,
      departments,
      queues,
      messagesToday,
      timestamp: new Date().toISOString(),
    };
  }

  async getAnalytics(days = 7): Promise<DashboardAnalytics> {
    const [trends, departmentDistribution, agentPerformance] = await Promise.all([
      this.getConversationTrends(days),
      this.getDepartmentDistribution(),
      this.getAgentPerformance(),
    ]);

    return { trends, departmentDistribution, agentPerformance };
  }

  private async getConversationTrends(days: number): Promise<DashboardTrendPoint[]> {
    const points: DashboardTrendPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [opened, resolved, messages] = await Promise.all([
        this.prisma.conversation.count({
          where: { deletedAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        this.prisma.conversation.count({
          where: { deletedAt: null, resolvedAt: { gte: dayStart, lte: dayEnd } },
        }),
        this.prisma.message.count({
          where: { deletedAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      points.push({
        date: dayStart.toISOString().slice(0, 10),
        opened,
        resolved,
        messages,
      });
    }

    return points;
  }

  private async getDepartmentDistribution(): Promise<DepartmentDistribution[]> {
    const [departments, counts] = await Promise.all([
      this.prisma.department.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, color: true },
      }),
      this.prisma.conversation.groupBy({
        by: ['departmentId'],
        where: {
          deletedAt: null,
          departmentId: { not: null },
          status: { in: ['OPEN', 'WAITING', 'PENDING', 'TRANSFERRED'] },
        },
        _count: { id: true },
      }),
    ]);

    const countMap = new Map(
      counts.map((c) => [c.departmentId, c._count.id]),
    );

    return departments
      .map((d) => ({
        departmentId: d.id,
        departmentName: d.name,
        count: countMap.get(d.id) ?? 0,
        color: d.color,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  private async getAgentPerformance(): Promise<AgentPerformance[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const agents = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { slug: { in: ['agent', 'supervisor'] } } } },
      },
      include: {
        department: { select: { name: true } },
        availability: { select: { status: true } },
        assignedConversations: {
          where: { deletedAt: null, status: { in: ['OPEN', 'WAITING', 'PENDING'] } },
          select: { id: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const resolvedCounts = await Promise.all(
      agents.map((agent) =>
        this.prisma.conversation.count({
          where: {
            deletedAt: null,
            assignedAgentId: agent.id,
            status: 'RESOLVED',
            resolvedAt: { gte: startOfDay },
          },
        }),
      ),
    );

    return agents.map((agent, index) => {
      const active = agent.assignedConversations.length;
      const maxCapacity = agent.maxCapacity || 5;
      return {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        departmentName: agent.department?.name,
        status: agent.availability?.status ?? 'OFFLINE',
        activeConversations: active,
        maxCapacity,
        utilization: Math.round((active / maxCapacity) * 100),
        resolvedToday: resolvedCounts[index],
      };
    });
  }

  private async getAvgFirstResponseMinutes(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        firstResponseAt: { not: null },
        createdAt: { gte: startOfDay },
      },
      select: { createdAt: true, firstResponseAt: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    if (conversations.length === 0) return 0;

    const totalMinutes = conversations.reduce((sum, c) => {
      if (!c.firstResponseAt) return sum;
      const diff = c.firstResponseAt.getTime() - c.createdAt.getTime();
      return sum + diff / 60000;
    }, 0);

    return Math.round(totalMinutes / conversations.length);
  }
}
