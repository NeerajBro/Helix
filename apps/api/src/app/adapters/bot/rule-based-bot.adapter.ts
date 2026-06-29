import { Injectable } from '@nestjs/common';
import { BOT_INTENTS, BotIntent, BotIntentResult } from '@helix/types';
import { BotAdapter, BotResponseContext } from './bot.adapter';
import {
  AFFIRMATIVE_KEYWORDS,
  HANDOFF_KEYWORDS,
  INTENT_KEYWORDS,
  INTENT_LABELS,
} from './bot-intents';

@Injectable()
export class RuleBasedBotAdapter implements BotAdapter {
  detectIntent(text: string): BotIntentResult {
    const normalized = text.toLowerCase();
    let bestIntent: BotIntent = 'unknown';
    let bestScore = 0;
    let matchedKeywords: string[] = [];

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [
      Exclude<BotIntent, 'unknown'>,
      string[],
    ][]) {
      const matches = keywords.filter((kw) => normalized.includes(kw));
      const score = matches.length;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
        matchedKeywords = matches;
      }
    }

    if (bestScore === 0) {
      return { intent: 'unknown', confidence: 0, matchedKeywords: [] };
    }

    return {
      intent: bestIntent,
      confidence: Math.min(bestScore / 3, 1),
      matchedKeywords,
    };
  }

  buildResponse(context: BotResponseContext, userMessage: string): string {
    const name = context.customerName ? ` ${context.customerName}` : '';

    if (context.isFirstMessage && !context.greeted) {
      return `Hello${name}! 👋 Welcome to HELIX Travel Support. I'm your virtual assistant and I can help with flights, hotels, refunds, and general inquiries.\n\nHow can I assist you today?`;
    }

    if (context.awaitingHandoff) {
      return `Great! I'm connecting you with our ${INTENT_LABELS[context.intent as Exclude<BotIntent, 'unknown'>] ?? 'support'} team now. An agent will be with you shortly.`;
    }

    const intentResult = this.detectIntent(userMessage);

    if (intentResult.intent === 'unknown') {
      return `I'd like to make sure you get the right help. Could you tell me a bit more? For example:\n• Flight changes or delays\n• Hotel reservations\n• Refunds or billing\n• A complaint or escalation\n\nOr type "agent" to speak with someone directly.`;
    }

    const label = INTENT_LABELS[intentResult.intent as Exclude<BotIntent, 'unknown'>];

    switch (intentResult.intent) {
      case BOT_INTENTS.REFUND:
        return `I understand you need help with a refund or billing matter. Our Finance team specializes in payment issues and can typically process refund requests within 5–7 business days.\n\nWould you like me to connect you with a Finance specialist? Reply **YES** to transfer, or share your booking reference for faster assistance.`;
      case BOT_INTENTS.HOTEL:
        return `I can help with hotel-related inquiries! Our Hotels team handles reservations, room changes, early check-in, and special requests.\n\nWould you like me to transfer you to a Hotels specialist? Reply **YES** to proceed, or tell me more about your reservation.`;
      case BOT_INTENTS.FLIGHT:
        return `I see this is about a flight. Our Flights team can assist with schedule changes, delays, cancellations, and baggage issues.\n\nWould you like me to connect you with a Flights agent? Reply **YES** to transfer, or provide your flight number for quicker help.`;
      case BOT_INTENTS.COMPLAINT:
        return `I'm sorry to hear you've had a frustrating experience. Your feedback is important to us, and our Customer Relations team is ready to help resolve this.\n\nWould you like me to escalate this to a specialist? Reply **YES** and I'll connect you right away.`;
      case BOT_INTENTS.GENERAL:
        return `I'm here to help! For specialized assistance, I can connect you with the right team:\n• **Flights** — schedule changes, delays\n• **Hotels** — reservations, modifications\n• **Finance** — refunds, billing\n\nWhat would you like help with, or type "agent" to speak with someone?`;
      default:
        return `I'll connect you with our ${label} team. Reply **YES** to proceed.`;
    }
  }

  isHandoffRequest(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return HANDOFF_KEYWORDS.some((kw) => normalized.includes(kw));
  }

  isAffirmative(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return AFFIRMATIVE_KEYWORDS.some(
      (kw) => normalized === kw || normalized.startsWith(`${kw} `) || normalized.endsWith(` ${kw}`),
    );
  }
}
