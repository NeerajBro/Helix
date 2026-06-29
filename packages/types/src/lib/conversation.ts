import {
  ConversationPriority,
  ConversationStatus,
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
} from './enums';

export interface ConversationSummary {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  subject?: string;
  aiSummary?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  departmentId?: string;
  departmentName?: string;
  queueId?: string;
  queueName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount?: number;
  unreadCount?: number;
  slaBreached: boolean;
  botHandled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface InboxMessage extends MessageDto {
  agentName?: string;
  attachments?: MessageAttachment[];
}

export interface InternalNote {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
}

export interface ConversationDetail extends ConversationSummary {
  customer: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    isVip: boolean;
    language: string;
  };
  assignedAgent?: { id: string; name: string; email: string };
  lockedBy?: { id: string; name: string };
  lockedAt?: string;
  botHandled: boolean;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  whatsappExpiresAt?: string;
  sentimentScore?: number;
  tags: ConversationTag[];
  internalNotes: InternalNote[];
  assignments: {
    id: string;
    agentId: string;
    agentName: string;
    isAuto: boolean;
    reason?: string;
    createdAt: string;
  }[];
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  agentId?: string;
  direction: MessageDirection;
  contentType: MessageContentType;
  content: string;
  status: MessageStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  language: string;
  isVip: boolean;
  lastContactedAt?: string;
  conversationCount: number;
  bookings: CustomerBooking[];
}

export interface CustomerBooking {
  id: string;
  type: string;
  reference: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}
