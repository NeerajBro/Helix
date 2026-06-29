import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { QueueRoutingStrategy } from '@prisma/client';
import { calculatePriorityScore } from '@helix/utils';
import { PriorityInput } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';

@Injectable()
export class PriorityEngineService {
  calculate(input: PriorityInput) {
    return calculatePriorityScore(input);
  }
}

@Injectable()
export class QueueRouterService {
  private roundRobinIndex = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async selectAgent(queueId: string): Promise<{ agentId: string; strategy: string } | null> {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null, isActive: true },
      include: { department: true, skill: true },
    });

    if (!queue) {
      throw new NotFoundException(`Queue ${queueId} not found`);
    }

    const agents = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        departmentId: queue.departmentId,
        availability: { status: { in: ['ONLINE', 'BUSY'] } },
      },
      include: {
        skills: queue.skillId ? { where: { skillId: queue.skillId } } : true,
        assignedConversations: {
          where: { status: { in: ['OPEN', 'PENDING', 'WAITING'] } },
        },
        availability: true,
      },
    });

    const eligible = agents.filter((a) => {
      const activeCount = a.assignedConversations.length;
      if (activeCount >= a.maxCapacity) return false;
      if (queue.skillId && a.skills.length === 0) return false;
      if (a.availability?.status === 'ON_BREAK' || a.availability?.status === 'OFFLINE') return false;
      return true;
    });

    if (eligible.length === 0) return null;

    switch (queue.routingStrategy) {
      case QueueRoutingStrategy.LEAST_BUSY:
        return this.leastBusy(eligible, queue.routingStrategy);
      case QueueRoutingStrategy.SKILL_BASED:
        return this.skillBased(eligible, queue.routingStrategy, queue.skillId);
      case QueueRoutingStrategy.PRIORITY:
        return this.leastBusy(eligible, queue.routingStrategy);
      case QueueRoutingStrategy.ROUND_ROBIN:
      default:
        return this.roundRobin(eligible, queue.id, queue.routingStrategy);
    }
  }

  private leastBusy(
    agents: { id: string; assignedConversations: unknown[] }[],
    strategy: QueueRoutingStrategy,
  ) {
    const sorted = [...agents].sort(
      (a, b) => a.assignedConversations.length - b.assignedConversations.length,
    );
    return { agentId: sorted[0].id, strategy };
  }

  private skillBased(
    agents: { id: string; skills: { level: number }[]; assignedConversations?: unknown[] }[],
    strategy: QueueRoutingStrategy,
    skillId: string | null,
  ) {
    if (!skillId) {
      return this.leastBusy(
        agents as { id: string; assignedConversations: unknown[] }[],
        strategy,
      );
    }
    const sorted = [...agents].sort((a, b) => {
      const levelA = a.skills[0]?.level ?? 0;
      const levelB = b.skills[0]?.level ?? 0;
      return levelB - levelA;
    });
    return { agentId: sorted[0].id, strategy };
  }

  private roundRobin(
    agents: { id: string }[],
    queueId: string,
    strategy: QueueRoutingStrategy,
  ) {
    const index = this.roundRobinIndex.get(queueId) ?? 0;
    const agent = agents[index % agents.length];
    this.roundRobinIndex.set(queueId, index + 1);
    return { agentId: agent.id, strategy };
  }
}

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priorityEngine: PriorityEngineService,
    private readonly queueRouter: QueueRouterService,
  ) {}

  async findAll(departmentId?: string) {
    const queues = await this.prisma.queue.findMany({
      where: {
        deletedAt: null,
        ...(departmentId && { departmentId }),
      },
      include: {
        department: true,
        skill: true,
        _count: {
          select: {
            conversations: {
              where: { status: { in: ['OPEN', 'PENDING', 'WAITING'] } },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return queues.map((q) => this.mapQueue(q));
  }

  async findOne(id: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        skill: true,
        _count: {
          select: {
            conversations: {
              where: { status: { in: ['OPEN', 'PENDING', 'WAITING'] } },
            },
          },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(`Queue ${id} not found`);
    }

    return this.mapQueue(queue);
  }

  async create(dto: CreateQueueDto) {
    const existing = await this.prisma.queue.findFirst({
      where: { slug: dto.slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Queue with this slug already exists');
    }

    const queue = await this.prisma.queue.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        departmentId: dto.departmentId,
        skillId: dto.skillId,
        routingStrategy: dto.routingStrategy ?? 'ROUND_ROBIN',
        priority: dto.priority ?? 0,
        slaFirstResponse: dto.slaFirstResponse,
        slaResolution: dto.slaResolution,
      },
    });

    return this.findOne(queue.id);
  }

  async update(id: string, dto: UpdateQueueDto) {
    await this.findOne(id);
    await this.prisma.queue.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.queue.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { deleted: true };
  }

  calculatePriority(input: PriorityInput) {
    return this.priorityEngine.calculate(input);
  }

  async routeNextAgent(queueId: string) {
    return this.queueRouter.selectAgent(queueId);
  }

  private mapQueue(q: {
    id: string;
    name: string;
    slug: string;
    departmentId: string;
    skillId: string | null;
    routingStrategy: QueueRoutingStrategy;
    priority: number;
    slaFirstResponse: number | null;
    slaResolution: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    department: { name: string };
    skill: { name: string } | null;
    _count: { conversations: number };
  }) {
    return {
      id: q.id,
      name: q.name,
      slug: q.slug,
      departmentId: q.departmentId,
      departmentName: q.department.name,
      skillId: q.skillId ?? undefined,
      skillName: q.skill?.name,
      routingStrategy: q.routingStrategy,
      priority: q.priority,
      slaFirstResponse: q.slaFirstResponse ?? undefined,
      slaResolution: q.slaResolution ?? undefined,
      isActive: q.isActive,
      waitingCount: q._count.conversations,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}
