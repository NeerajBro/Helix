import { CampaignStatus } from './enums';

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface WhatsAppNumberDto {
  id: string;
  phoneNumber: string;
  displayName: string;
  businessName?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDto {
  id: string;
  whatsAppNumberId?: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  language: string;
  header?: string;
  body: string;
  footer?: string;
  variables?: string[];
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDto {
  id: string;
  name: string;
  templateId?: string;
  templateName?: string;
  whatsAppNumberId?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipientDto {
  id: string;
  phone: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
}

export interface AuditLogDto {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface SettingDto {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface WhiteLabelSettings {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  supportEmail?: string;
  tagline?: string;
}
