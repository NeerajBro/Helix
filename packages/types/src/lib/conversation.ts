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
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
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
