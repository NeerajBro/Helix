import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SALESFORCE_ADAPTER } from './salesforce.adapter';
import { MockSalesforceAdapter } from './mock-salesforce.adapter';
import { RestSalesforceAdapterStub } from './rest-salesforce.adapter.stub';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MockSalesforceAdapter,
    RestSalesforceAdapterStub,
    {
      provide: SALESFORCE_ADAPTER,
      inject: [ConfigService, MockSalesforceAdapter, RestSalesforceAdapterStub],
      useFactory: (
        config: ConfigService,
        mock: MockSalesforceAdapter,
        rest: RestSalesforceAdapterStub,
      ) => {
        const mode = config.get<string>('SALESFORCE_ADAPTER', 'mock');
        return mode === 'rest' ? rest : mock;
      },
    },
  ],
  exports: [SALESFORCE_ADAPTER],
})
export class SalesforceAdapterModule {}
