import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CustomerQueryDto) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const where = {
      deletedAt: null,
      ...(query.isVip !== undefined && { isVip: query.isVip }),
      ...(query.search && {
        OR: [
          { phone: { contains: query.search } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { conversations: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = customers.map((c) => this.mapCustomer(c));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { conversations: true, bookings: true } },
        conversations: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            priority: true,
            subject: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return {
      ...this.mapCustomer(customer),
      conversationCount: customer._count.conversations,
      bookingCount: customer._count.bookings,
      recentConversations: customer.conversations.map((c) => ({
        id: c.id,
        status: c.status,
        priority: c.priority,
        subject: c.subject ?? undefined,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async getTimeline(id: string) {
    await this.findOne(id);

    const [conversations, messages, assignments] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { customerId: id, deletedAt: null },
        select: {
          id: true,
          status: true,
          subject: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.findMany({
        where: {
          deletedAt: null,
          conversation: { customerId: id, deletedAt: null },
        },
        select: {
          id: true,
          conversationId: true,
          senderType: true,
          direction: true,
          contentType: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.conversationAssignment.findMany({
        where: { conversation: { customerId: id } },
        select: {
          id: true,
          conversationId: true,
          agentId: true,
          isAuto: true,
          reason: true,
          createdAt: true,
          agent: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const events = [
      ...conversations.map((c) => ({
        type: 'conversation_created' as const,
        id: c.id,
        conversationId: c.id,
        title: c.subject ?? 'New conversation',
        status: c.status,
        timestamp: c.createdAt.toISOString(),
      })),
      ...messages.map((m) => ({
        type: 'message' as const,
        id: m.id,
        conversationId: m.conversationId,
        title: `${m.direction} ${m.contentType.toLowerCase()}`,
        preview: m.content.slice(0, 120),
        senderType: m.senderType,
        timestamp: m.createdAt.toISOString(),
      })),
      ...assignments.map((a) => ({
        type: 'assignment' as const,
        id: a.id,
        conversationId: a.conversationId,
        title: `Assigned to ${a.agent.firstName} ${a.agent.lastName}`,
        isAuto: a.isAuto,
        reason: a.reason ?? undefined,
        timestamp: a.createdAt.toISOString(),
      })),
    ];

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { customerId: id, events };
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Customer with this phone already exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        email: dto.email,
        language: dto.language ?? 'en',
        timezone: dto.timezone,
        isVip: dto.isVip ?? false,
      },
      include: { _count: { select: { conversations: true } } },
    });

    return this.mapCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: dto,
      include: { _count: { select: { conversations: true } } },
    });
    return this.mapCustomer(customer);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private mapCustomer(customer: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    language: string;
    timezone: string | null;
    isVip: boolean;
    lastContactedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { conversations: number };
  }) {
    return {
      id: customer.id,
      phone: customer.phone,
      name: customer.name ?? undefined,
      email: customer.email ?? undefined,
      avatarUrl: customer.avatarUrl ?? undefined,
      language: customer.language,
      timezone: customer.timezone ?? undefined,
      isVip: customer.isVip,
      lastContactedAt: customer.lastContactedAt?.toISOString(),
      conversationCount: customer._count?.conversations ?? 0,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
