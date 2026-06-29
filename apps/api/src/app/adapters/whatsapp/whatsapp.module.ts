import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WHATSAPP_ADAPTER } from './whatsapp.adapter';
import { MockWhatsAppAdapter } from './mock-whatsapp.adapter';
import { MetaWhatsAppAdapterStub } from './meta-whatsapp.adapter.stub';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MockWhatsAppAdapter,
    MetaWhatsAppAdapterStub,
    {
      provide: WHATSAPP_ADAPTER,
      inject: [ConfigService, MockWhatsAppAdapter, MetaWhatsAppAdapterStub],
      useFactory: (
        config: ConfigService,
        mock: MockWhatsAppAdapter,
        meta: MetaWhatsAppAdapterStub,
      ) => {
        const mode = config.get<string>('WHATSAPP_ADAPTER', 'mock');
        return mode === 'meta' ? meta : mock;
      },
    },
  ],
  exports: [WHATSAPP_ADAPTER, MockWhatsAppAdapter],
})
export class WhatsAppAdapterModule {}
