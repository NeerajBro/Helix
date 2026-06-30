import { Module } from '@nestjs/common';
import { SalesforceAdapterModule } from '../../adapters/salesforce/salesforce.module';
import { SalesforceSyncService } from './salesforce-sync.service';

@Module({
  imports: [SalesforceAdapterModule],
  providers: [SalesforceSyncService],
  exports: [SalesforceSyncService],
})
export class IntegrationsModule {}
