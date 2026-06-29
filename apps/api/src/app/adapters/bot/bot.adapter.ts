import { BotIntent, BotIntentResult } from '@helix/types';

export interface BotResponseContext {
  intent: BotIntent;
  customerName?: string;
  isFirstMessage: boolean;
  greeted: boolean;
  awaitingHandoff: boolean;
  messageCount: number;
}

export interface BotAdapter {
  detectIntent(text: string): BotIntentResult;
  buildResponse(context: BotResponseContext, userMessage: string): string;
  isHandoffRequest(text: string): boolean;
  isAffirmative(text: string): boolean;
}

export const BOT_ADAPTER = Symbol('BOT_ADAPTER');
