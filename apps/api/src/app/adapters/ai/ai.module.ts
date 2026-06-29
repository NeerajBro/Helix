import { Global, Module } from '@nestjs/common';
import { AI_ADAPTER } from './ai.adapter';
import { MockAiAdapter } from './mock-ai.adapter';

@Global()
@Module({
  providers: [
    MockAiAdapter,
    {
      provide: AI_ADAPTER,
      useExisting: MockAiAdapter,
    },
  ],
  exports: [AI_ADAPTER, MockAiAdapter],
})
export class AiAdapterModule {}
