import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentAvailabilityStatus } from '@prisma/client';
import { SOCKET_EVENTS } from '@helix/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';
import { UpdateAvailabilityDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async findAll(departmentId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(departmentId && { departmentId }),
        availability: { isNot: null },
      },
      include: {
        availability: true,
        department: true,
        assignedConversations: {
          where: { status: { in: ['OPEN', 'PENDING', 'WAITING'] } },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map((u) => ({
      id: u.availability!.id,
      userId: u.id,
      userName: `${u.firstName} ${u.lastName}`,
      status: u.availability!.status,
      reason: u.availability!.reason ?? undefined,
      since: u.availability!.since.toISOString(),
      departmentId: u.departmentId ?? undefined,
      departmentName: u.department?.name,
      activeConversations: u.assignedConversations.length,
      maxCapacity: u.maxCapacity,
    }));
  }

  async getMyStatus(userId: string) {
    const availability = await this.prisma.agentAvailability.findUnique({
      where: { userId },
    });

    if (!availability) {
      throw new NotFoundException('Availability record not found');
    }

    return {
      status: availability.status,
      reason: availability.reason ?? undefined,
      since: availability.since.toISOString(),
    };
  }

  async updateMyStatus(userId: string, dto: UpdateAvailabilityDto) {
    const availability = await this.prisma.agentAvailability.upsert({
      where: { userId },
      update: {
        status: dto.status,
        reason: dto.reason,
        since: new Date(),
      },
      create: {
        userId,
        status: dto.status,
        reason: dto.reason,
      },
    });

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { departmentId: true, firstName: true, lastName: true },
    });

    const payload = {
      userId,
      userName: user ? `${user.firstName} ${user.lastName}` : userId,
      status: availability.status,
      reason: availability.reason ?? undefined,
      since: availability.since.toISOString(),
    };

    this.realtime.emitToAgent(userId, SOCKET_EVENTS.AGENT_STATUS_CHANGED, payload);
    if (user?.departmentId) {
      this.realtime.emitToDepartment(user.departmentId, SOCKET_EVENTS.AGENT_STATUS_CHANGED, payload);
    }
    void this.realtime.refreshDashboardStats();

    return {
      status: availability.status,
      reason: availability.reason ?? undefined,
      since: availability.since.toISOString(),
    };
  }

  async startBreak(userId: string, reason?: string) {
    return this.updateMyStatus(userId, {
      status: AgentAvailabilityStatus.ON_BREAK,
      reason: reason ?? 'Break',
    });
  }

  async endBreak(userId: string) {
    return this.updateMyStatus(userId, {
      status: AgentAvailabilityStatus.ONLINE,
    });
  }

  async getSummary() {
    const statuses = await this.prisma.agentAvailability.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const summary: Record<string, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      AWAY: 0,
      ON_BREAK: 0,
      BUSY: 0,
    };

    for (const s of statuses) {
      summary[s.status] = s._count.status;
    }

    return {
      total: Object.values(summary).reduce((a, b) => a + b, 0),
      byStatus: summary,
    };
  }
}
