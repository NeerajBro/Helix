export interface CannedResponseDto {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerConversationHistoryItem {
  id: string;
  status: string;
  subject?: string;
  departmentName?: string;
  assignedAgentName?: string;
  closedBy?: string;
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
  durationMinutes?: number;
  messageCount: number;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
