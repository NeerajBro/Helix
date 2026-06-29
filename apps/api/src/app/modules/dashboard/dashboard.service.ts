import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DashboardStats } from '@helix/types';

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
      departments,
      queues,
      messagesToday,
      availabilitySummary,
      totalAgents,
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
      agentsOnline,
      totalAgents,
      departments,
      queues,
      messagesToday,
      timestamp: new Date().toISOString(),
    };
  }
}
