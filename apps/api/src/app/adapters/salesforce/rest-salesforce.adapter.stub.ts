import { Injectable, Logger } from '@nestjs/common';
import { SalesforceCaseData, SalesforceCaseResult } from '@helix/types';
import { SalesforceAdapter } from './salesforce.adapter';

/** Production stub — wire Salesforce REST API + OAuth here. */
@Injectable()
export class RestSalesforceAdapterStub implements SalesforceAdapter {
  private readonly logger = new Logger(RestSalesforceAdapterStub.name);

  async createCase(_data: SalesforceCaseData): Promise<SalesforceCaseResult> {
    this.logger.warn('RestSalesforceAdapterStub.createCase — not implemented');
    throw new Error('Salesforce REST adapter not configured');
  }

  async updateCase(_id: string, _data: Partial<SalesforceCaseData>): Promise<SalesforceCaseResult> {
    this.logger.warn('RestSalesforceAdapterStub.updateCase — not implemented');
    throw new Error('Salesforce REST adapter not configured');
  }
}
