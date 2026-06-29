import { Injectable } from '@nestjs/common';
import { BOT_INTENTS, BotIntent } from '@helix/types';
import { AiAdapter, AiSummaryInput } from './ai.adapter';
import { INTENT_LABELS } from '../bot/bot-intents';

@Injectable()
export class MockAiAdapter implements AiAdapter {
  async generateSummary(input: AiSummaryInput): Promise<string> {
    const customerMessages = input.messages
      .filter((m) => m.senderType === 'CUSTOMER')
      .map((m) => m.content.trim())
      .filter(Boolean);

    const intentLabel = input.intent && input.intent !== 'unknown'
      ? INTENT_LABELS[input.intent as Exclude<BotIntent, 'unknown'>]
      : 'General inquiry';

    const customerName = input.customerName ?? 'Customer';
    const keyPoints =
      customerMessages.length > 0
        ? customerMessages.slice(-4).join(' | ')
        : 'No customer messages captured.';

    const sentiment = this.inferSentiment(customerMessages.join(' '));
    const urgency = input.intent === BOT_INTENTS.COMPLAINT ? 'High' : 'Normal';

    return [
      `**AI Summary** — ${customerName}`,
      `**Category:** ${intentLabel}`,
      `**Urgency:** ${urgency} | **Sentiment:** ${sentiment}`,
      `**Key points:** ${keyPoints}`,
      `**Recommended action:** Review conversation history and acknowledge the customer's concern within SLA. Prioritize resolution based on ${intentLabel.toLowerCase()} team guidelines.`,
    ].join('\n');
  }

  private inferSentiment(text: string): string {
    const negative = ['unhappy', 'terrible', 'awful', 'frustrated', 'complaint', 'disappointed'];
    const positive = ['thank', 'great', 'appreciate', 'helpful'];
    const lower = text.toLowerCase();
    if (negative.some((w) => lower.includes(w))) return 'Negative';
    if (positive.some((w) => lower.includes(w))) return 'Positive';
    return 'Neutral';
  }
}
