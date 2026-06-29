import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  WhatsAppAdapter,
  WhatsAppMessage,
  WhatsAppSendResult,
  WhatsAppTemplateMessage,
} from './whatsapp.adapter';

@Injectable()
export class MockWhatsAppAdapter implements WhatsAppAdapter {
  private readonly logger = new Logger(MockWhatsAppAdapter.name);

  async sendMessage(to: string, message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const externalId = `mock_${randomUUID()}`;
    this.logger.debug(`Mock WhatsApp → ${to}: [${message.contentType}] ${message.content.slice(0, 80)}`);
    return { externalId, status: 'sent' };
  }

  async sendTemplate(to: string, template: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    const externalId = `mock_tpl_${randomUUID()}`;
    this.logger.debug(`Mock WhatsApp template → ${to}: ${template.templateName}`);
    return { externalId, status: 'sent' };
  }
}
