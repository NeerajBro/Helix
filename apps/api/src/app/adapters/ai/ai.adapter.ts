import { BotIntent } from '@helix/types';

export interface AiSummaryInput {
  customerName?: string;
  intent?: BotIntent;
  messages: { senderType: string; content: string; createdAt: string }[];
}

export interface AiAdapter {
  generateSummary(input: AiSummaryInput): Promise<string>;
}

export const AI_ADAPTER = Symbol('AI_ADAPTER');
