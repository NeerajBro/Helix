import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const CAMPAIGN_QUEUE = 'campaigns';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redis.url') },
      }),
    }),
    BullModule.registerQueue({ name: CAMPAIGN_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
