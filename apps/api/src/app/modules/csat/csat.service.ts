import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { CsatSurveyDto } from '@helix/types';
import { SOCKET_EVENTS } from '@helix/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeService } from '../../infrastructure/socket/realtime.service';
import { SubmitCsatDto } from './dto/csat.dto';

@Injectable()
export class CsatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async requestSurvey(conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: { csatSurvey: true },
    });
    if (!conversation || conversation.csatSurvey) return;
    if (!['RESOLVED', 'CLOSED'].includes(conversation.status)) return;

    const metadata = (conversation.metadata as Prisma.JsonObject | null) ?? {};
    if (metadata['csatPending']) return;

    const content =
      'Thank you for contacting HELIX Support! How would you rate your experience? Reply with a number from 1 (poor) to 5 (excellent).';

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.BOT,
        direction: MessageDirection.OUTBOUND,
        contentType: MessageContentType.TEXT,
        content,
        status: MessageStatus.SENT,
        sentAt: now,
        deliveredAt: now,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: { ...metadata, csatPending: true, csatRequestedAt: now.toISOString() },
      },
    });

    const mapped = {
      id: message.id,
      conversationId: message.conversationId,
      senderType: message.senderType,
      direction: message.direction,
      contentType: message.contentType,
      content: message.content,
      status: message.status,
      sentAt: message.sentAt?.toISOString(),
      deliveredAt: message.deliveredAt?.toISOString(),
      createdAt: message.createdAt.toISOString(),
    };

    await this.realtime.emitConversationEvent(
      conversationId,
      SOCKET_EVENTS.MESSAGE_RECEIVED,
      { conversationId, message: mapped },
      conversation.departmentId,
      conversation.assignedAgentId,
    );

    this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.SIMULATOR_MESSAGE, {
      conversationId,
      customerId: conversation.customerId,
      message: mapped,
      direction: 'outbound',
      csatPending: true,
    });
  }

  async submit(dto: SubmitCsatDto): Promise<CsatSurveyDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: dto.conversationId, deletedAt: null },
      include: {
        csatSurvey: true,
        assignedAgent: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${dto.conversationId} not found`);
    }
    if (conversation.csatSurvey) {
      throw new ConflictException('CSAT survey already submitted');
    }
    if (!['RESOLVED', 'CLOSED'].includes(conversation.status)) {
      throw new BadRequestException('CSAT is only available for resolved or closed conversations');
    }

    const survey = await this.prisma.csatSurvey.create({
      data: {
        conversationId: dto.conversationId,
        customerId: conversation.customerId,
        agentId: conversation.assignedAgentId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    const metadata = (conversation.metadata as Prisma.JsonObject | null) ?? {};
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { metadata: { ...metadata, csatPending: false } },
    });

    const thankYou = `Thank you for your feedback (${dto.rating}/5)! We appreciate you choosing HELIX.`;
    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderType: MessageSenderType.BOT,
        direction: MessageDirection.OUTBOUND,
        contentType: MessageContentType.TEXT,
        content: thankYou,
        status: MessageStatus.SENT,
        sentAt: now,
        deliveredAt: now,
      },
    });

    this.realtime.emitToSimulator(conversation.customerId, SOCKET_EVENTS.SIMULATOR_MESSAGE, {
      conversationId: dto.conversationId,
      customerId: conversation.customerId,
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderType: message.senderType,
        direction: message.direction,
        contentType: message.contentType,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      },
      direction: 'outbound',
      csatPending: false,
    });

    return this.mapSurvey(survey, conversation);
  }

  async getForConversation(conversationId: string): Promise<CsatSurveyDto | null> {
    const survey = await this.prisma.csatSurvey.findUnique({
      where: { conversationId },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    return survey ? this.mapSurvey(survey) : null;
  }

  isCsatPending(metadata: Prisma.JsonValue | null): boolean {
    const m = metadata as Prisma.JsonObject | null;
    return m?.['csatPending'] === true;
  }

  private mapSurvey(
    survey: {
      id: string;
      conversationId: string;
      customerId: string;
      agentId: string | null;
      rating: number;
      comment: string | null;
      createdAt: Date;
      agent?: { id: string; firstName: string; lastName: string } | null;
      customer?: { id: string; name: string | null } | null;
    },
    conversation?: {
      assignedAgent: { id: string; firstName: string; lastName: string } | null;
      customer: { id: string; name: string | null };
    },
  ): CsatSurveyDto {
    const agent = survey.agent ?? conversation?.assignedAgent;
    const customer = survey.customer ?? conversation?.customer;
    return {
      id: survey.id,
      conversationId: survey.conversationId,
      customerId: survey.customerId,
      agentId: survey.agentId ?? undefined,
      agentName: agent ? `${agent.firstName} ${agent.lastName}` : undefined,
      customerName: customer?.name ?? undefined,
      rating: survey.rating,
      comment: survey.comment ?? undefined,
      createdAt: survey.createdAt.toISOString(),
    };
  }
}
