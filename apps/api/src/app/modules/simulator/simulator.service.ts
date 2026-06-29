import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  ConversationStatus,
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MinioService, UploadableFile } from '../../infrastructure/storage/minio.service';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';
import {
  WHATSAPP_ADAPTER,
  WhatsAppAdapter,
} from '../../adapters/whatsapp/whatsapp.adapter';
import { SOCKET_EVENTS, WHATSAPP_SESSION_WINDOW_HOURS } from '@helix/shared';
import { SimulatorCustomerSummary, SimulatorConversationState } from '@helix/types';
import { SimulatorCustomerQueryDto, SimulatorPresenceDto, SimulatorSendMessageDto } from './dto/simulator.dto';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';
import { BotService } from '../bot/bot.service';

const ACTIVE_STATUSES: ConversationStatus[] = ['OPEN', 'PENDING', 'WAITING', 'TRANSFERRED'];

@Injectable()
export class SimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly realtime: RealtimeService,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: WhatsAppAdapter,
    private readonly botService: BotService,
  ) {}

  async listCustomers(query: SimulatorCustomerQueryDto) {
    const { skip, take, page, pageSize } = parsePagination(query, { page: 1, pageSize: 50 });
    const where = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { phone: { contains: query.search } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { lastContactedAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = await Promise.all(customers.map((c) => this.mapCustomerSummary(c)));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async getCustomerState(customerId: string): Promise<SimulatorConversationState> {
    const customer = await this.getCustomerOrThrow(customerId);
    const conversation = await this.getOrCreateActiveConversation(customerId);
    const summary = await this.mapCustomerSummary(customer, conversation.id);

    return {
      customer: summary,
      conversationId: conversation.id,
      status: conversation.status,
      subject: conversation.subject ?? undefined,
    };
  }

  async getMessages(customerId: string) {
    const conversation = await this.getOrCreateActiveConversation(customerId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { attachments: true },
    });

    return Promise.all(messages.map((m) => this.mapMessage(m)));
  }

  async sendCustomerMessage(
    customerId: string,
    dto: SimulatorSendMessageDto,
    file?: UploadableFile,
  ) {
    const customer = await this.getCustomerOrThrow(customerId);
    const conversation = await this.getOrCreateActiveConversation(customerId);

    let contentType: MessageContentType =
      (dto.contentType as MessageContentType | undefined) ?? MessageContentType.TEXT;
    if (file) {
      contentType = this.inferContentType(file.mimetype);
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + WHATSAPP_SESSION_WINDOW_HOURS);

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: MessageSenderType.CUSTOMER,
        direction: MessageDirection.INBOUND,
        contentType,
        content: dto.content || file?.originalname || '',
        status: MessageStatus.DELIVERED,
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

    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          whatsappExpiresAt: expiresAt,
          updatedAt: now,
          status: conversation.status === 'CLOSED' || conversation.status === 'RESOLVED'
            ? 'OPEN'
            : conversation.status,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { lastContactedAt: now },
      }),
    ]);

    const mapped = await this.mapMessage(
      await this.prisma.message.findUniqueOrThrow({
        where: { id: message.id },
        include: { attachments: true },
      }),
    );

    const payload = {
      conversationId: conversation.id,
      customerId,
      message: mapped,
      direction: 'inbound' as const,
    };

    await this.realtime.emitConversationEvent(
      conversation.id,
      SOCKET_EVENTS.MESSAGE_RECEIVED,
      payload,
      conversation.departmentId,
      conversation.assignedAgentId,
    );
    this.realtime.emitToSimulator(customerId, SOCKET_EVENTS.SIMULATOR_MESSAGE, payload);
    this.realtime.emitToSimulator(customerId, SOCKET_EVENTS.SIMULATOR_STATUS, {
      customerId,
      whatsappExpiresAt: expiresAt.toISOString(),
      windowOpen: true,
    });

    void this.whatsapp.sendMessage(customer.phone, {
      contentType: contentType as never,
      content: mapped.content,
    });

    if (conversation.botHandled) {
      void this.botService.handleCustomerMessage(conversation.id, message.id).catch(() => undefined);
    }

    return mapped;
  }

  async setPresence(customerId: string, dto: SimulatorPresenceDto) {
    const customer = await this.getCustomerOrThrow(customerId);
    const metadata = (customer.metadata as Prisma.JsonObject | null) ?? {};
    metadata['simulatorOnline'] = dto.isOnline;

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { metadata },
    });

    this.realtime.emitToSimulator(customerId, SOCKET_EVENTS.SIMULATOR_STATUS, {
      customerId,
      isOnline: dto.isOnline,
    });

    return { customerId, isOnline: dto.isOnline };
  }

  async markMessagesRead(customerId: string) {
    const conversation = await this.getOrCreateActiveConversation(customerId);
    const now = new Date();

    await this.prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: now, status: MessageStatus.READ },
    });

    this.realtime.emitToSimulator(customerId, SOCKET_EVENTS.SIMULATOR_STATUS, {
      customerId,
      messagesRead: true,
    });

    return { updated: true };
  }

  private async getCustomerOrThrow(customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
    return customer;
  }

  private async getOrCreateActiveConversation(customerId: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        customerId,
        deletedAt: null,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversation) {
      return conversation;
    }

    const [whatsAppNumber, generalQueue] = await Promise.all([
      this.prisma.whatsAppNumber.findFirst({ where: { isDefault: true, isActive: true } }),
      this.prisma.queue.findFirst({
        where: { deletedAt: null, isActive: true, slug: 'general-queue' },
        include: { department: true },
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + WHATSAPP_SESSION_WINDOW_HOURS);

    conversation = await this.prisma.conversation.create({
      data: {
        customerId,
        departmentId: generalQueue?.departmentId,
        queueId: generalQueue?.id,
        whatsAppNumberId: whatsAppNumber?.id,
        status: 'OPEN',
        priority: 'NORMAL',
        subject: 'WhatsApp conversation',
        botHandled: true,
        whatsappExpiresAt: expiresAt,
      },
    });

    await this.realtime.emitConversationEvent(
      conversation.id,
      SOCKET_EVENTS.CONVERSATION_CREATED,
      { conversationId: conversation.id, customerId },
      conversation.departmentId,
      null,
    );

    return conversation;
  }

  private async mapCustomerSummary(
    customer: {
      id: string;
      phone: string;
      name: string | null;
      isVip: boolean;
      lastContactedAt: Date | null;
      metadata: Prisma.JsonValue | null;
    },
    activeConversationId?: string,
  ): Promise<SimulatorCustomerSummary> {
    const conversation = activeConversationId
      ? await this.prisma.conversation.findUnique({ where: { id: activeConversationId } })
      : await this.prisma.conversation.findFirst({
          where: { customerId: customer.id, deletedAt: null, status: { in: ACTIVE_STATUSES } },
          orderBy: { updatedAt: 'desc' },
        });

    const metadata = (customer.metadata as Prisma.JsonObject | null) ?? {};
    const isOnline = metadata['simulatorOnline'] !== false;
    const expiresAt = conversation?.whatsappExpiresAt;
    const windowOpen = expiresAt ? expiresAt.getTime() > Date.now() : false;

    const unreadCount = conversation
      ? await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            direction: MessageDirection.OUTBOUND,
            readAt: null,
            deletedAt: null,
          },
        })
      : 0;

    return {
      id: customer.id,
      phone: customer.phone,
      name: customer.name ?? undefined,
      isVip: customer.isVip,
      isOnline,
      lastContactedAt: customer.lastContactedAt?.toISOString(),
      activeConversationId: conversation?.id,
      whatsappExpiresAt: expiresAt?.toISOString(),
      windowOpen,
      unreadCount,
    };
  }

  private inferContentType(mimeType: string): MessageContentType {
    if (mimeType.startsWith('image/')) return MessageContentType.IMAGE;
    if (mimeType.startsWith('audio/')) return MessageContentType.AUDIO;
    if (mimeType.startsWith('video/')) return MessageContentType.VIDEO;
    return MessageContentType.DOCUMENT;
  }

  private async mapMessage(message: {
    id: string;
    conversationId: string;
    senderType: MessageSenderType;
    direction: MessageDirection;
    contentType: MessageContentType;
    content: string;
    status: MessageStatus;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
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
