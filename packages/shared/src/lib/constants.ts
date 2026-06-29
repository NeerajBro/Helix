export const APP_NAME = 'HELIX';
export const APP_DESCRIPTION = 'Enterprise Customer Support Platform';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';

export const WHATSAPP_SESSION_WINDOW_HOURS = 24;

export const DEPARTMENT_SLUGS = {
  FLIGHTS: 'flights',
  HOTELS: 'hotels',
  FINANCE: 'finance',
  COMPLAINTS: 'complaints',
  CORPORATE: 'corporate',
  GENERAL: 'general',
} as const;

export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  AGENT: 'agent',
  VIEWER: 'viewer',
} as const;

export const PERMISSION_MODULES = [
  'users',
  'roles',
  'departments',
  'skills',
  'conversations',
  'messages',
  'queues',
  'reports',
  'settings',
  'campaigns',
  'templates',
  'audit',
] as const;

export const SKILL_SLUGS = {
  FLIGHT_BOOKING: 'flight-booking',
  HOTEL_BOOKING: 'hotel-booking',
  REFUNDS: 'refunds',
  COMPLAINTS: 'complaints-handling',
  CORPORATE: 'corporate-accounts',
  GENERAL: 'general-support',
} as const;

export const PRIORITY_WEIGHTS = {
  VIP: 50,
  COMPLAINT: 40,
  URGENT_TRAVEL: 35,
  NEGATIVE_SENTIMENT: 25,
  WHATSAPP_EXPIRY: 30,
  SLA_BREACH: 45,
  WAITING_TIME_PER_MINUTE: 1,
  WHATSAPP_EXPIRY_THRESHOLD_HOURS: 2,
  NEGATIVE_SENTIMENT_THRESHOLD: -0.3,
} as const;
