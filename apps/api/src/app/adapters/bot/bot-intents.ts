import { BOT_INTENTS, BotIntent } from '@helix/types';
import { DEPARTMENT_SLUGS } from '@helix/shared';

export const INTENT_KEYWORDS: Record<Exclude<BotIntent, 'unknown'>, string[]> = {
  [BOT_INTENTS.REFUND]: [
    'refund',
    'money back',
    'reimburse',
    'reimbursement',
    'billing',
    'payment',
    'invoice',
    'charge',
    'charged',
    'credit',
  ],
  [BOT_INTENTS.HOTEL]: [
    'hotel',
    'room',
    'accommodation',
    'reservation',
    'check-in',
    'check in',
    'checkout',
    'check out',
    'stay',
    'lodging',
  ],
  [BOT_INTENTS.FLIGHT]: [
    'flight',
    'airline',
    'boarding',
    'delay',
    'delayed',
    'cancelled',
    'canceled',
    'baggage',
    'luggage',
    'ticket',
    'departure',
    'arrival',
  ],
  [BOT_INTENTS.COMPLAINT]: [
    'complaint',
    'complain',
    'unhappy',
    'terrible',
    'awful',
    'disappointed',
    'escalate',
    'manager',
    'poor service',
    'unacceptable',
    'frustrated',
  ],
  [BOT_INTENTS.GENERAL]: ['help', 'question', 'info', 'support', 'hello', 'hi', 'hey'],
};

export const INTENT_QUEUE_SLUG: Record<Exclude<BotIntent, 'unknown'>, string> = {
  [BOT_INTENTS.REFUND]: 'finance-queue',
  [BOT_INTENTS.HOTEL]: 'hotels-queue',
  [BOT_INTENTS.FLIGHT]: 'flights-queue',
  [BOT_INTENTS.COMPLAINT]: 'complaints-queue',
  [BOT_INTENTS.GENERAL]: 'general-queue',
};

export const INTENT_DEPARTMENT_SLUG: Record<Exclude<BotIntent, 'unknown'>, string> = {
  [BOT_INTENTS.REFUND]: DEPARTMENT_SLUGS.FINANCE,
  [BOT_INTENTS.HOTEL]: DEPARTMENT_SLUGS.HOTELS,
  [BOT_INTENTS.FLIGHT]: DEPARTMENT_SLUGS.FLIGHTS,
  [BOT_INTENTS.COMPLAINT]: DEPARTMENT_SLUGS.COMPLAINTS,
  [BOT_INTENTS.GENERAL]: DEPARTMENT_SLUGS.GENERAL,
};

export const INTENT_LABELS: Record<Exclude<BotIntent, 'unknown'>, string> = {
  [BOT_INTENTS.REFUND]: 'Finance & Refunds',
  [BOT_INTENTS.HOTEL]: 'Hotels',
  [BOT_INTENTS.FLIGHT]: 'Flights',
  [BOT_INTENTS.COMPLAINT]: 'Customer Relations',
  [BOT_INTENTS.GENERAL]: 'General Support',
};

export const HANDOFF_KEYWORDS = [
  'agent',
  'human',
  'person',
  'representative',
  'speak to',
  'talk to',
  'transfer',
  'connect me',
  'real person',
  'someone',
];

export const AFFIRMATIVE_KEYWORDS = [
  'yes',
  'yeah',
  'yep',
  'sure',
  'ok',
  'okay',
  'please',
  'proceed',
  'go ahead',
  'confirm',
];
