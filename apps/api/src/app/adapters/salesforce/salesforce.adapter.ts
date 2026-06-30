import { SalesforceCaseData, SalesforceCaseResult } from '@helix/types';

export interface SalesforceAdapter {
  createCase(data: SalesforceCaseData): Promise<SalesforceCaseResult>;
  updateCase(salesforceCaseId: string, data: Partial<SalesforceCaseData>): Promise<SalesforceCaseResult>;
}

export const SALESFORCE_ADAPTER = Symbol('SALESFORCE_ADAPTER');
