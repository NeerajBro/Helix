export const BOT_INTENTS = {
  REFUND: 'refund',
  HOTEL: 'hotel',
  FLIGHT: 'flight',
  COMPLAINT: 'complaint',
  GENERAL: 'general',
} as const;

export type BotIntent = (typeof BOT_INTENTS)[keyof typeof BOT_INTENTS] | 'unknown';

export interface BotIntentResult {
  intent: BotIntent;
  confidence: number;
  matchedKeywords: string[];
}

export interface BotHandoffResult {
  conversationId: string;
  intent: BotIntent;
  departmentId: string;
  departmentName: string;
  queueId: string;
  queueName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  aiSummary: string;
}

export interface BotConversationState {
  greeted?: boolean;
  detectedIntent?: BotIntent;
  awaitingHandoff?: boolean;
  handoffIntent?: BotIntent;
}
