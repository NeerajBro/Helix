export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Conversations
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_TRANSFERRED: 'conversation:transferred',
  CONVERSATION_RESOLVED: 'conversation:resolved',
  CONVERSATION_CLOSED: 'conversation:closed',

  // Messages
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_STATUS_UPDATED: 'message:status_updated',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Agent
  AGENT_STATUS_CHANGED: 'agent:status_changed',
  AGENT_CAPACITY_UPDATED: 'agent:capacity_updated',

  // Queue
  QUEUE_UPDATED: 'queue:updated',

  // Dashboard
  DASHBOARD_STATS_UPDATED: 'dashboard:stats_updated',

  // Notifications & SLA
  NOTIFICATION_NEW: 'notification:new',
  SLA_BREACH: 'sla:breach',

  // Simulator
  SIMULATOR_MESSAGE: 'simulator:message',
  SIMULATOR_STATUS: 'simulator:status',

  // Bot
  BOT_HANDOFF: 'bot:handoff',
  BOT_MESSAGE: 'bot:message',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
