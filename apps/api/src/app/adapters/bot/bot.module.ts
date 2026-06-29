import { Global, Module } from '@nestjs/common';
import { BOT_ADAPTER } from './bot.adapter';
import { RuleBasedBotAdapter } from './rule-based-bot.adapter';

@Global()
@Module({
  providers: [
    RuleBasedBotAdapter,
    {
      provide: BOT_ADAPTER,
      useExisting: RuleBasedBotAdapter,
    },
  ],
  exports: [BOT_ADAPTER, RuleBasedBotAdapter],
})
export class BotAdapterModule {}
