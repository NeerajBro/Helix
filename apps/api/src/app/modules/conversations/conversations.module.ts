import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { ConversationsService } from './conversations.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CsatModule } from '../csat/csat.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [IntegrationsModule, CsatModule, SlaModule],
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
