export enum SalesforceSyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface SalesforceCaseData {
  conversationId: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  customerName?: string;
  customerPhone: string;
  customerEmail?: string;
  departmentName?: string;
  agentName?: string;
  aiSummary?: string;
}

export interface SalesforceCaseResult {
  salesforceCaseId: string;
  caseNumber: string;
  status: string;
  priority: string;
  subject: string;
}

export interface SalesforceCaseDto {
  id: string;
  conversationId: string;
  salesforceCaseId?: string;
  caseNumber?: string;
  subject?: string;
  status?: string;
  priority?: string;
  syncStatus: SalesforceSyncStatus;
  lastSyncedAt?: string;
  syncError?: string;
}

export interface BookingDto {
  id: string;
  customerId: string;
  type: string;
  reference: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  currency?: string;
}
