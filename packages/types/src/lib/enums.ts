export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum AgentAvailabilityStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  ON_BREAK = 'ON_BREAK',
  BUSY = 'BUSY',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum ConversationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageSenderType {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  BOT = 'BOT',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum MessageContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  TEMPLATE = 'TEMPLATE',
  INTERACTIVE = 'INTERACTIVE',
}

export enum NotificationType {
  CONVERSATION_ASSIGNED = 'CONVERSATION_ASSIGNED',
  CONVERSATION_TRANSFERRED = 'CONVERSATION_TRANSFERRED',
  SLA_BREACH = 'SLA_BREACH',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  SYSTEM = 'SYSTEM',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum BookingType {
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  PACKAGE = 'PACKAGE',
  OTHER = 'OTHER',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ASSIGN = 'ASSIGN',
  TRANSFER = 'TRANSFER',
  RESOLVE = 'RESOLVE',
  CLOSE = 'CLOSE',
  EXPORT = 'EXPORT',
}
