import { MessageContentType } from '@helix/types';

export interface WhatsAppMessage {
  contentType: MessageContentType;
  content: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
}

export interface WhatsAppTemplateMessage {
  templateName: string;
  language: string;
  parameters?: string[];
}

export interface WhatsAppSendResult {
  externalId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface WhatsAppAdapter {
  sendMessage(to: string, message: WhatsAppMessage): Promise<WhatsAppSendResult>;
  sendTemplate(to: string, template: WhatsAppTemplateMessage): Promise<WhatsAppSendResult>;
}

export const WHATSAPP_ADAPTER = Symbol('WHATSAPP_ADAPTER');
