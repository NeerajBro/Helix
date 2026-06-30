import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { ConversationsService } from './conversations.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
