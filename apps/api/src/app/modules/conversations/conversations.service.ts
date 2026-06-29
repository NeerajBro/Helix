import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MinioService, UploadableFile } from '../../infrastructure/storage/minio.service';
import {
  AddTagDto,
  AssignConversationDto,
  ConversationQueryDto,
  CreateConversationDto,
  CreateInternalNoteDto,
  CreateTagDto,
  TransferConversationDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { CreateMessageDto, MessageQueryDto } from './dto/message.dto';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';
import { SOCKET_EVENTS, WHATSAPP_SESSION_WINDOW_HOURS } from '@helix/shared';
import { JwtPayload } from '@helix/types';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';
import {
  ConversationStatus,
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
} from '@prisma/client';
import {
  WHATSAPP_ADAPTER,
  WhatsAppAdapter,
} from '../../adapters/whatsapp/whatsapp.adapter';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly realtime: RealtimeService,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: WhatsAppAdapter,
  ) {}

  async findAll(query: ConversationQueryDto) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const where = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assignedAgentId && { assignedAgentId: query.assignedAgentId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.queueId && { queueId: query.queueId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.search && {
        customer: {
          OR: [
            { phone: { contains: query.search } },
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: true,
          assignedAgent: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
          queue: { select: { id: true, name: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items = conversations.map((c) => this.mapSummary(c));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        assignedAgent: { select: { id: true, firstName: true, lastName: true, email: true } },
        lockedBy: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true, slug: true } },
        queue: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { agent: { select: { id: true, firstName: true, lastName: true } } },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return this.mapDetail(conversation);
  }

  async create(dto: CreateConversationDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const whatsAppNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + WHATSAPP_SESSION_WINDOW_HOURS);

    const conversation = await this.prisma.conversation.create({
      data: {
        customerId: dto.customerId,
        departmentId: dto.departmentId,
        queueId: dto.queueId,
        subject: dto.subject,
        priority: dto.priority ?? 'NORMAL',
        status: 'OPEN',
        whatsAppNumberId: whatsAppNumber?.id,
        whatsappExpiresAt: expiresAt,
        botHandled: true,
      },
    });

    await this.prisma.customer.update({
      where: { id: dto.customerId },
      data: { lastContactedAt: new Date() },
    });

    const result = await this.findOne(conversation.id);
    await this.realtime.emitConversationEvent(
      conversation.id,
      SOCKET_EVENTS.CONVERSATION_CREATED,
      { conversation: result },
      result.departmentId,
      result.assignedAgentId,
    );
    return result;
  }

  async update(id: string, dto: UpdateConversationDto) {
    await this.findOne(id);
    await this.prisma.conversation.update({ where: { id }, data: dto });
    const result = await this.findOne(id);
    await this.realtime.emitConversationEvent(
      id,
      SOCKET_EVENTS.CONVERSATION_UPDATED,
      { conversation: result },
      result.departmentId,
      result.assignedAgentId,
    );
    return result;
  }

  async assign(id: string, dto: AssignConversationDto, user: JwtPayload) {
    const conversation = await this.getConversationOrThrow(id);
    const agent = await this.prisma.user.findFirst({
      where: { id: dto.agentId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!agent) {
      throw new NotFoundException(`Agent ${dto.agentId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id },
        data: {
          assignedAgentId: dto.agentId,
          status: conversation.status === 'WAITING' ? 'OPEN' : conversation.status,
          lockedById: null,
          lockedAt: null,
        },
      }),
      this.prisma.conversationAssignment.create({
        data: {
          conversationId: id,
          agentId: dto.agentId,
          assignedById: user.sub,
          isAuto: false,
          reason: dto.reason,
        },
      }),
    ]);

    const result = await this.findOne(id);
    await this.realtime.emitConversationEvent(
      id,
      SOCKET_EVENTS.CONVERSATION_ASSIGNED,
      { conversationId: id, agentId: dto.agentId, conversation: result },
      result.departmentId,
      dto.agentId,
    );
    this.realtime.emitToAgent(dto.agentId, SOCKET_EVENTS.CONVERSATION_ASSIGNED, {
      conversationId: id,
      agentId: dto.agentId,
      conversation: result,
    });
    return result;
  }

  async transfer(id: string, dto: TransferConversationDto, user: JwtPayload) {
    await this.getConversationOrThrow(id);

    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, deletedAt: null },
    });
    if (!department) {
      throw new NotFoundException(`Department ${dto.departmentId} not found`);
    }

    if (dto.agentId) {
      await this.assign(id, { agentId: dto.agentId, reason: dto.reason }, user);
    }

    await this.prisma.conversation.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        queueId: dto.queueId,
        status: 'TRANSFERRED',
        lockedById: null,
        lockedAt: null,
        ...(dto.agentId ? {} : { assignedAgentId: null }),
      },
    });

    const result = await this.findOne(id);
    await this.realtime.emitConversationEvent(
      id,
      SOCKET_EVENTS.CONVERSATION_TRANSFERRED,
      { conversationId: id, departmentId: dto.departmentId, conversation: result },
      dto.departmentId,
      result.assignedAgentId,
    );
    return result;
  }

  async resolve(id: string) {
    const conversation = await this.getConversationOrThrow(id);
    if (conversation.status === 'CLOSED') {
      throw new BadRequestException('Conversation is already closed');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        lockedById: null,
        lockedAt: null,
      },
    });

    const result = await this.findOne(id);
    await this.realtime.emitConversationEvent(
      id,
      SOCKET_EVENTS.CONVERSATION_RESOLVED,
      { conversationId: id, conversation: result },
      result.departmentId,
      result.assignedAgentId,
    );
    return result;
  }

  async close(id: string) {
    await this.getConversationOrThrow(id);
    await this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        lockedById: null,
        lockedAt: null,
      },
    });

    const result = await this.findOne(id);
    await this.realtime.emitConversationEvent(
      id,
      SOCKET_EVENTS.CONVERSATION_CLOSED,
      { conversationId: id, conversation: result },
      result.departmentId,
      result.assignedAgentId,
    );
    return result;
  }

  async lock(id: string, user: JwtPayload) {
    const conversation = await this.getConversationOrThrow(id);
    if (conversation.lockedById && conversation.lockedById !== user.sub) {
      throw new ConflictException('Conversation is locked by another agent');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: { lockedById: user.sub, lockedAt: new Date() },
    });

    return this.findOne(id);
  }

  async unlock(id: string, user: JwtPayload) {
    const conversation = await this.getConversationOrThrow(id);
    if (
      conversation.lockedById &&
      conversation.lockedById !== user.sub &&
      !user.permissions.includes('conversations:assign')
    ) {
      throw new ForbiddenException('Cannot unlock conversation locked by another agent');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: { lockedById: null, lockedAt: null },
    });

    return this.findOne(id);
  }

  async findMessages(conversationId: string, query: MessageQueryDto) {
    await this.getConversationOrThrow(conversationId);
    const { skip, take, page, pageSize } = parsePagination(query, { page: 1, pageSize: 50 });

    const where = { conversationId, deletedAt: null };
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          agent: { select: { id: true, firstName: true, lastName: true } },
          attachments: true,
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    const items = await Promise.all(messages.map((m) => this.mapMessage(m)));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async createMessage(
    conversationId: string,
    dto: CreateMessageDto,
    user: JwtPayload,
    file?: UploadableFile,
  ) {
    const conversation = await this.getConversationOrThrow(conversationId);
    if (conversation.lockedById && conversation.lockedById !== user.sub) {
      throw new ConflictException('Conversation is locked by another agent');
    }

    let contentType: MessageContentType =
      (dto.contentType as MessageContentType | undefined) ?? MessageContentType.TEXT;
    if (file) {
      contentType = this.inferContentType(file.mimetype);
    }

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.AGENT,
        agentId: user.sub,
        direction: MessageDirection.OUTBOUND,
        contentType,
        content: dto.content || file?.originalname || '',
        status: MessageStatus.SENT,
        sentAt: now,
        deliveredAt: now,
      },
    });

    if (file) {
      const uploaded = await this.minio.upload(file);
      await this.prisma.attachment.create({
        data: {
          messageId: message.id,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          storageKey: uploaded.storageKey,
          url: uploaded.url,
        },
      });
    }

    const updateData: {
      updatedAt: Date;
      firstResponseAt?: Date;
      status?: ConversationStatus;
    } = { updatedAt: now };

    if (!conversation.firstResponseAt) {
      updateData.firstResponseAt = now;
    }
    if (conversation.status === 'WAITING' || conversation.status === 'PENDING') {
      updateData.status = 'OPEN';
    }

    await this.prisma.$transaction([
      this.prisma.conversation.update({ where: { id: conversationId }, data: updateData }),
      this.prisma.customer.update({
        where: { id: conversation.customerId },
        data: { lastContactedAt: now },
      }),
    ]);

    const mapped = await this.getMessage(message.id);
    await this.realtime.emitConversationEvent(
      conversationId,
      SOCKET_EVENTS.MESSAGE_RECEIVED,
      { conversationId, message: mapped },
      conversation.departmentId,
      conversation.assignedAgentId,
    );

    const customer = await this.prisma.customer.findUnique({
      where: { id: conversation.customerId },
      select: { phone: true },
    });
    if (customer) {
      void this.whatsapp.sendMessage(customer.phone, {
        contentType: contentType as never,
        content: mapped.content,
      });
      this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.SIMULATOR_MESSAGE, {
        conversationId,
        customerId: conversation.customerId,
        message: mapped,
        direction: 'outbound',
      });
    }

    return mapped;
  }

  async getMessage(id: string) {
    const message = await this.prisma.message.findFirst({
      where: { id, deletedAt: null },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
      },
    });
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return this.mapMessage(message);
  }

  async findTags() {
    const tags = await this.prisma.tag.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async createTag(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Tag already exists');
    }
    const tag = await this.prisma.tag.create({
      data: { name: dto.name, color: dto.color ?? '#757575' },
    });
    return { id: tag.id, name: tag.name, color: tag.color };
  }

  async addTag(conversationId: string, dto: AddTagDto) {
    await this.getConversationOrThrow(conversationId);
    const tag = await this.prisma.tag.findFirst({
      where: { id: dto.tagId, deletedAt: null },
    });
    if (!tag) {
      throw new NotFoundException(`Tag ${dto.tagId} not found`);
    }

    await this.prisma.conversationTag.upsert({
      where: {
        conversationId_tagId: { conversationId, tagId: dto.tagId },
      },
      create: { conversationId, tagId: dto.tagId },
      update: {},
    });

    return this.findOne(conversationId);
  }

  async removeTag(conversationId: string, tagId: string) {
    await this.getConversationOrThrow(conversationId);
    await this.prisma.conversationTag.deleteMany({
      where: { conversationId, tagId },
    });
    return this.findOne(conversationId);
  }

  async findNotes(conversationId: string) {
    await this.getConversationOrThrow(conversationId);
    const notes = await this.prisma.internalNote.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return notes.map((n) => ({
      id: n.id,
      conversationId: n.conversationId,
      content: n.content,
      author: {
        id: n.author.id,
        name: `${n.author.firstName} ${n.author.lastName}`,
      },
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  async createNote(conversationId: string, dto: CreateInternalNoteDto, user: JwtPayload) {
    await this.getConversationOrThrow(conversationId);
    const note = await this.prisma.internalNote.create({
      data: {
        conversationId,
        authorId: user.sub,
        content: dto.content,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return {
      id: note.id,
      conversationId: note.conversationId,
      content: note.content,
      author: {
        id: note.author.id,
        name: `${note.author.firstName} ${note.author.lastName}`,
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private async getConversationOrThrow(id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  private inferContentType(mimeType: string): MessageContentType {
    if (mimeType.startsWith('image/')) return MessageContentType.IMAGE;
    if (mimeType.startsWith('audio/')) return MessageContentType.AUDIO;
    if (mimeType.startsWith('video/')) return MessageContentType.VIDEO;
    return MessageContentType.DOCUMENT;
  }

  private mapSummary(conversation: {
    id: string;
    customerId: string;
    status: ConversationStatus;
    priority: string;
    subject: string | null;
    aiSummary: string | null;
    assignedAgentId: string | null;
    departmentId: string | null;
    queueId: string | null;
    slaBreached: boolean;
    createdAt: Date;
    updatedAt: Date;
    customer: { phone: string; name: string | null };
    assignedAgent: { id: string; firstName: string; lastName: string } | null;
    department: { id: string; name: string } | null;
    queue: { id: string; name: string } | null;
    messages: { content: string; createdAt: Date }[];
    _count: { messages: number };
  }) {
    const lastMessage = conversation.messages[0];
    return {
      id: conversation.id,
      customerId: conversation.customerId,
      customerName: conversation.customer.name ?? undefined,
      customerPhone: conversation.customer.phone,
      status: conversation.status,
      priority: conversation.priority,
      subject: conversation.subject ?? undefined,
      aiSummary: conversation.aiSummary ?? undefined,
      assignedAgentId: conversation.assignedAgentId ?? undefined,
      assignedAgentName: conversation.assignedAgent
        ? `${conversation.assignedAgent.firstName} ${conversation.assignedAgent.lastName}`
        : undefined,
      departmentId: conversation.departmentId ?? undefined,
      departmentName: conversation.department?.name,
      queueId: conversation.queueId ?? undefined,
      queueName: conversation.queue?.name,
      lastMessage: lastMessage?.content,
      lastMessageAt: lastMessage?.createdAt.toISOString(),
      messageCount: conversation._count.messages,
      slaBreached: conversation.slaBreached,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private mapDetail(conversation: {
    id: string;
    customerId: string;
    status: ConversationStatus;
    priority: string;
    subject: string | null;
    aiSummary: string | null;
    assignedAgentId: string | null;
    lockedById: string | null;
    lockedAt: Date | null;
    departmentId: string | null;
    queueId: string | null;
    botHandled: boolean;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    slaBreached: boolean;
    whatsappExpiresAt: Date | null;
    sentimentScore: number | null;
    createdAt: Date;
    updatedAt: Date;
    customer: {
      id: string;
      phone: string;
      name: string | null;
      email: string | null;
      isVip: boolean;
      language: string;
    };
    assignedAgent: { id: string; firstName: string; lastName: string; email: string } | null;
    lockedBy: { id: string; firstName: string; lastName: string } | null;
    department: { id: string; name: string; slug: string } | null;
    queue: { id: string; name: string; slug: string } | null;
    tags: { tag: { id: string; name: string; color: string } }[];
    internalNotes: {
      id: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      author: { id: string; firstName: string; lastName: string };
    }[];
    assignments: {
      id: string;
      agentId: string;
      isAuto: boolean;
      reason: string | null;
      createdAt: Date;
      agent: { id: string; firstName: string; lastName: string };
    }[];
    messages: { content: string; createdAt: Date }[];
  }) {
    const lastMessage = conversation.messages[0];
    return {
      ...this.mapSummary({
        ...conversation,
        messages: conversation.messages,
        _count: { messages: conversation.messages.length },
      }),
      customer: {
        id: conversation.customer.id,
        phone: conversation.customer.phone,
        name: conversation.customer.name ?? undefined,
        email: conversation.customer.email ?? undefined,
        isVip: conversation.customer.isVip,
        language: conversation.customer.language,
      },
      assignedAgent: conversation.assignedAgent
        ? {
            id: conversation.assignedAgent.id,
            name: `${conversation.assignedAgent.firstName} ${conversation.assignedAgent.lastName}`,
            email: conversation.assignedAgent.email,
          }
        : undefined,
      lockedBy: conversation.lockedBy
        ? {
            id: conversation.lockedBy.id,
            name: `${conversation.lockedBy.firstName} ${conversation.lockedBy.lastName}`,
          }
        : undefined,
      lockedAt: conversation.lockedAt?.toISOString(),
      botHandled: conversation.botHandled,
      firstResponseAt: conversation.firstResponseAt?.toISOString(),
      resolvedAt: conversation.resolvedAt?.toISOString(),
      closedAt: conversation.closedAt?.toISOString(),
      whatsappExpiresAt: conversation.whatsappExpiresAt?.toISOString(),
      sentimentScore: conversation.sentimentScore ?? undefined,
      tags: conversation.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      internalNotes: conversation.internalNotes.map((n) => ({
        id: n.id,
        content: n.content,
        author: {
          id: n.author.id,
          name: `${n.author.firstName} ${n.author.lastName}`,
        },
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      assignments: conversation.assignments.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        agentName: `${a.agent.firstName} ${a.agent.lastName}`,
        isAuto: a.isAuto,
        reason: a.reason ?? undefined,
        createdAt: a.createdAt.toISOString(),
      })),
      lastMessage: lastMessage?.content,
      lastMessageAt: lastMessage?.createdAt.toISOString(),
    };
  }

  private async mapMessage(message: {
    id: string;
    conversationId: string;
    senderType: MessageSenderType;
    agentId: string | null;
    direction: MessageDirection;
    contentType: MessageContentType;
    content: string;
    status: MessageStatus;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
    agent: { id: string; firstName: string; lastName: string } | null;
    attachments: {
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      storageKey: string;
      url: string | null;
    }[];
  }) {
    const attachments = await Promise.all(
      message.attachments.map(async (a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        url: a.url ?? (await this.minio.getPresignedUrl(a.storageKey)),
      })),
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderType: message.senderType,
      agentId: message.agentId ?? undefined,
      agentName: message.agent
        ? `${message.agent.firstName} ${message.agent.lastName}`
        : undefined,
      direction: message.direction,
      contentType: message.contentType,
      content: message.content,
      status: message.status,
      attachments,
      sentAt: message.sentAt?.toISOString(),
      deliveredAt: message.deliveredAt?.toISOString(),
      readAt: message.readAt?.toISOString(),
      createdAt: message.createdAt.toISOString(),
    };
  }
}
