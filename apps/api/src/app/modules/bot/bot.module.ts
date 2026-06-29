import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { QueuesModule } from '../queues/queues.module';
import { BotAdapterModule } from '../../adapters/bot/bot.module';
import { AiAdapterModule } from '../../adapters/ai/ai.module';

@Module({
  imports: [QueuesModule, BotAdapterModule, AiAdapterModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
