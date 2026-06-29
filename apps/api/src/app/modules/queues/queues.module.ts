import { Module } from '@nestjs/common';
import { QueuesController } from './queues.controller';
import { QueuesService, PriorityEngineService, QueueRouterService } from './queues.service';

@Module({
  controllers: [QueuesController],
  providers: [QueuesService, PriorityEngineService, QueueRouterService],
  exports: [QueuesService, PriorityEngineService, QueueRouterService],
})
export class QueuesModule {}
