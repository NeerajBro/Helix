import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  PaginatedResponse,
  SimulatorConversationState,
  SimulatorCustomerSummary,
} from '@helix/types';
import { MessageContentType } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export interface SimulatorMessage {
  id: string;
  conversationId: string;
  senderType: string;
  direction: string;
  contentType: MessageContentType;
  content: string;
  status: string;
  attachments: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    url: string;
  }[];
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SimulatorService {
  private readonly http = inject(HttpClient);

  listCustomers(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}&pageSize=100` : '?pageSize=100';
    return this.http.get<ApiWrapper<PaginatedResponse<SimulatorCustomerSummary>>>(
      `${API_URL}/simulator/customers${params}`,
    );
  }

  getCustomerState(customerId: string) {
    return this.http.get<ApiWrapper<SimulatorConversationState>>(
      `${API_URL}/simulator/customers/${customerId}`,
    );
  }

  getMessages(customerId: string) {
    return this.http.get<ApiWrapper<SimulatorMessage[]>>(
      `${API_URL}/simulator/customers/${customerId}/messages`,
    );
  }

  sendMessage(customerId: string, content: string, file?: File) {
    if (file) {
      const form = new FormData();
      form.append('content', content || file.name);
      form.append('file', file);
      return this.http.post<ApiWrapper<SimulatorMessage>>(
        `${API_URL}/simulator/customers/${customerId}/messages`,
        form,
      );
    }
    return this.http.post<ApiWrapper<SimulatorMessage>>(
      `${API_URL}/simulator/customers/${customerId}/messages`,
      { content },
    );
  }

  setPresence(customerId: string, isOnline: boolean) {
    return this.http.patch<ApiWrapper<{ customerId: string; isOnline: boolean }>>(
      `${API_URL}/simulator/customers/${customerId}/presence`,
      { isOnline },
    );
  }

  markRead(customerId: string) {
    return this.http.post<ApiWrapper<{ updated: boolean }>>(
      `${API_URL}/simulator/customers/${customerId}/read`,
      {},
    );
  }
}
