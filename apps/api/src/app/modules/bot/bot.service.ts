import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';
import { QueueRouterService } from '../queues/queues.service';
import { BOT_ADAPTER, BotAdapter } from '../../adapters/bot/bot.adapter';
import { AI_ADAPTER, AiAdapter } from '../../adapters/ai/ai.adapter';
import {
  WHATSAPP_ADAPTER,
  WhatsAppAdapter,
} from '../../adapters/whatsapp/whatsapp.adapter';
import {
  BOT_INTENTS,
  BotConversationState,
  BotHandoffResult,
  BotIntent,
} from '@helix/types';
import { SOCKET_EVENTS } from '@helix/shared';
import {
  INTENT_DEPARTMENT_SLUG,
  INTENT_QUEUE_SLUG,
  INTENT_LABELS,
  INTENT_KEYWORDS,
} from '../../adapters/bot/bot-intents';

const BOT_REPLY_DELAY_MS = 1200;

@Injectable()
export class BotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly queueRouter: QueueRouterService,
    @Inject(BOT_ADAPTER) private readonly bot: BotAdapter,
    @Inject(AI_ADAPTER) private readonly ai: AiAdapter,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: WhatsAppAdapter,
  ) {}

  async handleCustomerMessage(conversationId: string, _messageId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        customer: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || !conversation.botHandled) {
      return;
    }

    const inboundMessages = conversation.messages.filter(
      (m) => m.direction === MessageDirection.INBOUND,
    );
    const latestInbound = inboundMessages[inboundMessages.length - 1];
    if (!latestInbound) {
      return;
    }

    const botState = this.getBotState(conversation.metadata);
    const botMessageCount = conversation.messages.filter(
      (m) => m.senderType === MessageSenderType.BOT,
    ).length;
    const isFirstCustomerMessage = inboundMessages.length === 1;

    this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.TYPING_START, {
      conversationId,
      userId: 'bot',
      userName: 'HELIX Bot',
    });

    try {
      await this.delay(BOT_REPLY_DELAY_MS);

      const intentResult = this.bot.detectIntent(latestInbound.content);

      if (this.shouldHandoff(latestInbound.content, botState)) {
        const intent =
          botState.handoffIntent ??
          botState.detectedIntent ??
          (intentResult.intent === 'unknown' ? BOT_INTENTS.GENERAL : intentResult.intent);
        await this.handoffToHuman(conversationId, intent, 'Customer requested agent');
        return;
      }

      if (isFirstCustomerMessage && botMessageCount === 0) {
        const welcome = this.bot.buildResponse(
          {
            intent: intentResult.intent === 'unknown' ? BOT_INTENTS.GENERAL : intentResult.intent,
            customerName: conversation.customer.name ?? undefined,
            isFirstMessage: true,
            greeted: false,
            awaitingHandoff: false,
            messageCount: inboundMessages.length,
          },
          latestInbound.content,
        );
        await this.sendBotMessage(conversationId, welcome);
        await this.updateBotState(conversationId, {
          greeted: true,
          detectedIntent: intentResult.intent,
        });

        if (intentResult.intent !== 'unknown' && intentResult.confidence >= 0.33) {
          await this.delay(800);
          const response = this.bot.buildResponse(
            {
              intent: intentResult.intent,
              customerName: conversation.customer.name ?? undefined,
              isFirstMessage: false,
              greeted: true,
              awaitingHandoff: false,
              messageCount: inboundMessages.length,
            },
            latestInbound.content,
          );
          await this.sendBotMessage(conversationId, response);
          await this.updateBotState(conversationId, {
            awaitingHandoff: true,
            handoffIntent: intentResult.intent,
          });
        }
        return;
      }

      if (intentResult.intent !== 'unknown' && intentResult.confidence >= 0.33) {
        const response = this.bot.buildResponse(
          {
            intent: intentResult.intent,
            customerName: conversation.customer.name ?? undefined,
            isFirstMessage: false,
            greeted: botState.greeted ?? true,
            awaitingHandoff: false,
            messageCount: inboundMessages.length,
          },
          latestInbound.content,
        );
        await this.sendBotMessage(conversationId, response);
        await this.updateBotState(conversationId, {
          detectedIntent: intentResult.intent,
          awaitingHandoff: true,
          handoffIntent: intentResult.intent,
        });
        return;
      }

      const fallback = this.bot.buildResponse(
        {
          intent: 'unknown',
          customerName: conversation.customer.name ?? undefined,
          isFirstMessage: false,
          greeted: botState.greeted ?? true,
          awaitingHandoff: false,
          messageCount: inboundMessages.length,
        },
        latestInbound.content,
      );
      await this.sendBotMessage(conversationId, fallback);
    } finally {
      this.emitBotTypingStop(conversation.customerId, conversationId);
    }
  }

  private emitBotTypingStop(customerId: string, conversationId: string): void {
    this.realtime.emitToSimulator(customerId, SOCKET_EVENTS.TYPING_STOP, {
      conversationId,
      userId: 'bot',
    });
  }

  async handoffToHuman(
    conversationId: string,
    intent: BotIntent,
    reason: string,
  ): Promise<BotHandoffResult> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        customer: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const resolvedIntent = intent === 'unknown' ? BOT_INTENTS.GENERAL : intent;
    const queueSlug = INTENT_QUEUE_SLUG[resolvedIntent as Exclude<BotIntent, 'unknown'>];
    const deptSlug = INTENT_DEPARTMENT_SLUG[resolvedIntent as Exclude<BotIntent, 'unknown'>];

    const [queue, department] = await Promise.all([
      this.prisma.queue.findFirst({ where: { slug: queueSlug, deletedAt: null, isActive: true } }),
      this.prisma.department.findFirst({ where: { slug: deptSlug, deletedAt: null } }),
    ]);

    if (!queue || !department) {
      throw new NotFoundException(`Queue or department not found for intent ${resolvedIntent}`);
    }

    const aiSummary = await this.ai.generateSummary({
      customerName: conversation.customer.name ?? undefined,
      intent: resolvedIntent,
      messages: conversation.messages.map((m) => ({
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    const now = new Date();
    let assignedAgentId: string | undefined;
    let assignedAgentName: string | undefined;

    const routing = await this.queueRouter.selectAgent(queue.id);
    if (routing) {
      assignedAgentId = routing.agentId;
      const agent = await this.prisma.user.findUnique({
        where: { id: routing.agentId },
        select: { firstName: true, lastName: true },
      });
      assignedAgentName = agent ? `${agent.firstName} ${agent.lastName}` : undefined;
    }

    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          botHandled: false,
          botTransferredAt: now,
          departmentId: department.id,
          queueId: queue.id,
          status: assignedAgentId ? 'OPEN' : 'WAITING',
          assignedAgentId: assignedAgentId ?? null,
          aiSummary,
          priority: resolvedIntent === BOT_INTENTS.COMPLAINT ? 'HIGH' : conversation.priority,
          metadata: this.mergeMetadata(conversation.metadata, {
            botState: {
              greeted: true,
              detectedIntent: resolvedIntent,
              awaitingHandoff: false,
              handoffIntent: resolvedIntent,
            },
          }),
        },
      }),
      ...(assignedAgentId
        ? [
            this.prisma.conversationAssignment.create({
              data: {
                conversationId,
                agentId: assignedAgentId,
                isAuto: true,
                reason: `Auto-assigned from bot handoff (${reason})`,
              },
            }),
          ]
        : []),
    ]);

    const label = INTENT_LABELS[resolvedIntent as Exclude<BotIntent, 'unknown'>];
    const handoffMessage = assignedAgentName
      ? `You're now connected with ${assignedAgentName} from our ${label} team. They'll assist you shortly.`
      : `I've placed you in the ${label} queue. The next available agent will join shortly — thank you for your patience.`;

    await this.sendBotMessage(conversationId, handoffMessage, { isHandoff: true });

    const updated = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        customer: true,
        department: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const result: BotHandoffResult = {
      conversationId,
      intent: resolvedIntent,
      departmentId: department.id,
      departmentName: department.name,
      queueId: queue.id,
      queueName: queue.name,
      assignedAgentId,
      assignedAgentName,
      aiSummary,
    };

    await this.realtime.emitConversationEvent(
      conversationId,
      SOCKET_EVENTS.CONVERSATION_TRANSFERRED,
      {
        conversationId,
        departmentId: department.id,
        intent: resolvedIntent,
        botHandoff: true,
        aiSummary,
        conversation: {
          id: updated.id,
          status: updated.status,
          botHandled: updated.botHandled,
          aiSummary: updated.aiSummary,
          departmentId: updated.departmentId,
          queueId: updated.queueId,
          assignedAgentId: updated.assignedAgentId,
        },
      },
      department.id,
      assignedAgentId,
    );

    if (assignedAgentId) {
      this.realtime.emitToAgent(assignedAgentId, SOCKET_EVENTS.CONVERSATION_ASSIGNED, {
        conversationId,
        agentId: assignedAgentId,
        botHandoff: true,
        aiSummary,
      });
    }

    this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.BOT_HANDOFF, {
      conversationId,
      customerId: conversation.customerId,
      intent: resolvedIntent,
      aiSummary,
    });

    return result;
  }

  async regenerateSummary(conversationId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        customer: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const botState = this.getBotState(conversation.metadata);
    const summary = await this.ai.generateSummary({
      customerName: conversation.customer.name ?? undefined,
      intent: botState.detectedIntent,
      messages: conversation.messages.map((m) => ({
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { aiSummary: summary },
    });

    await this.realtime.emitConversationEvent(
      conversationId,
      SOCKET_EVENTS.CONVERSATION_UPDATED,
      { conversationId, aiSummary: summary },
      conversation.departmentId,
      conversation.assignedAgentId,
    );

    return summary;
  }

  listIntents() {
    return Object.entries(INTENT_LABELS).map(([intent, label]) => ({
      intent,
      label,
      queueSlug: INTENT_QUEUE_SLUG[intent as Exclude<BotIntent, 'unknown'>],
      departmentSlug: INTENT_DEPARTMENT_SLUG[intent as Exclude<BotIntent, 'unknown'>],
      keywords: INTENT_KEYWORDS[intent as Exclude<BotIntent, 'unknown'>],
    }));
  }

  private async sendBotMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: { customer: true },
    });
    if (!conversation) return;

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.BOT,
        direction: MessageDirection.OUTBOUND,
        contentType: MessageContentType.TEXT,
        content,
        status: MessageStatus.DELIVERED,
        sentAt: now,
        deliveredAt: now,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
      include: { attachments: true },
    });

    const updateData: Prisma.ConversationUpdateInput = { updatedAt: now };
    if (!conversation.firstResponseAt) {
      updateData.firstResponseAt = now;
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    const mapped = {
      id: message.id,
      conversationId: message.conversationId,
      senderType: message.senderType,
      direction: message.direction,
      contentType: message.contentType,
      content: message.content,
      status: message.status,
      attachments: [],
      sentAt: message.sentAt?.toISOString(),
      deliveredAt: message.deliveredAt?.toISOString(),
      readAt: message.readAt?.toISOString(),
      createdAt: message.createdAt.toISOString(),
    };

    const payload = {
      conversationId,
      customerId: conversation.customerId,
      message: mapped,
      direction: 'outbound' as const,
    };

    await this.realtime.emitConversationEvent(
      conversationId,
      SOCKET_EVENTS.MESSAGE_RECEIVED,
      payload,
      conversation.departmentId,
      conversation.assignedAgentId,
    );
    this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.SIMULATOR_MESSAGE, payload);

    void this.whatsapp.sendMessage(conversation.customer.phone, {
      contentType: MessageContentType.TEXT as never,
      content,
    });
  }

  private shouldHandoff(text: string, state: BotConversationState): boolean {
    if (this.bot.isHandoffRequest(text)) return true;
    if (state.awaitingHandoff && this.bot.isAffirmative(text)) return true;
    return false;
  }

  private getBotState(metadata: Prisma.JsonValue | null): BotConversationState {
    const meta = (metadata as Prisma.JsonObject | null) ?? {};
    const botState = meta['botState'];
    if (botState && typeof botState === 'object' && !Array.isArray(botState)) {
      return botState as BotConversationState;
    }
    return {};
  }

  private async updateBotState(conversationId: string, patch: Partial<BotConversationState>) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });
    if (!conversation) return;

    const current = this.getBotState(conversation.metadata);
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.mergeMetadata(conversation.metadata, {
          botState: { ...current, ...patch },
        }),
      },
    });
  }

  private mergeMetadata(
    existing: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base = (existing as Prisma.JsonObject | null) ?? {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
