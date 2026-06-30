import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { SalesforceCaseData, SalesforceCaseResult } from '@helix/types';
import { SalesforceAdapter } from './salesforce.adapter';

@Injectable()
export class MockSalesforceAdapter implements SalesforceAdapter {
  private readonly logger = new Logger(MockSalesforceAdapter.name);
  private readonly cases = new Map<string, SalesforceCaseResult>();

  async createCase(data: SalesforceCaseData): Promise<SalesforceCaseResult> {
    const salesforceCaseId = `500${randomInt(10000000, 99999999)}`;
    const caseNumber = String(randomInt(100000, 999999));
    const result: SalesforceCaseResult = {
      salesforceCaseId,
      caseNumber,
      status: data.status,
      priority: data.priority,
      subject: data.subject,
    };
    this.cases.set(salesforceCaseId, result);
    this.logger.debug(
      `Mock SF createCase #${caseNumber}: ${data.subject} (${data.customerPhone})`,
    );
    return result;
  }

  async updateCase(
    salesforceCaseId: string,
    data: Partial<SalesforceCaseData>,
  ): Promise<SalesforceCaseResult> {
    const existing = this.cases.get(salesforceCaseId) ?? {
      salesforceCaseId,
      caseNumber: salesforceCaseId.slice(-6),
      status: 'New',
      priority: 'Medium',
      subject: 'HELIX Support Case',
    };
    const result: SalesforceCaseResult = {
      ...existing,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      subject: data.subject ?? existing.subject,
    };
    this.cases.set(salesforceCaseId, result);
    this.logger.debug(`Mock SF updateCase ${salesforceCaseId}: status=${result.status}`);
    return result;
  }
}
