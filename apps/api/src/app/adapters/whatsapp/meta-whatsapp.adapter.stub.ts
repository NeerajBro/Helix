import { Injectable } from '@nestjs/common';
import {
  WhatsAppAdapter,
  WhatsAppMessage,
  WhatsAppSendResult,
  WhatsAppTemplateMessage,
} from './whatsapp.adapter';

@Injectable()
export class MetaWhatsAppAdapterStub implements WhatsAppAdapter {
  private notImplemented(): never {
    throw new Error('Meta WhatsApp Cloud API adapter is not configured. Use WHATSAPP_ADAPTER=mock for development.');
  }

  sendMessage(_to: string, _message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    return Promise.resolve(this.notImplemented());
  }

  sendTemplate(_to: string, _template: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    return Promise.resolve(this.notImplemented());
  }
}
