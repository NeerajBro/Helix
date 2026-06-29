import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ConversationDetail,
  ConversationSummary,
  InboxMessage,
  InternalNote,
  PaginatedResponse,
} from '@helix/types';
import { ConversationPriority, ConversationStatus } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export interface ConversationFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assignedAgentId?: string;
  departmentId?: string;
}

@Injectable({ providedIn: 'root' })
export class ConversationsService {
  private readonly http = inject(HttpClient);

  list(filters: ConversationFilters = {}): Observable<PaginatedResponse<ConversationSummary>> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.assignedAgentId) params.set('assignedAgentId', filters.assignedAgentId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    const qs = params.toString();
    return this.http
      .get<ApiWrapper<PaginatedResponse<ConversationSummary>>>(
        `${API_URL}/conversations${qs ? `?${qs}` : ''}`,
      )
      .pipe(map((r) => r.data));
  }

  get(id: string): Observable<ConversationDetail> {
    return this.http
      .get<ApiWrapper<ConversationDetail>>(`${API_URL}/conversations/${id}`)
      .pipe(map((r) => r.data));
  }

  getMessages(conversationId: string, pageSize = 100): Observable<PaginatedResponse<InboxMessage>> {
    return this.http
      .get<ApiWrapper<PaginatedResponse<InboxMessage>>>(
        `${API_URL}/conversations/${conversationId}/messages?pageSize=${pageSize}`,
      )
      .pipe(map((r) => r.data));
  }

  sendMessage(conversationId: string, content: string, file?: File): Observable<InboxMessage> {
    if (file) {
      const form = new FormData();
      form.append('content', content || file.name);
      form.append('file', file);
      return this.http
        .post<ApiWrapper<InboxMessage>>(`${API_URL}/conversations/${conversationId}/messages`, form)
        .pipe(map((r) => r.data));
    }
    return this.http
      .post<ApiWrapper<InboxMessage>>(`${API_URL}/conversations/${conversationId}/messages`, {
        content,
      })
      .pipe(map((r) => r.data));
  }

  resolve(conversationId: string): Observable<ConversationDetail> {
    return this.http
      .patch<ApiWrapper<ConversationDetail>>(`${API_URL}/conversations/${conversationId}/resolve`, {})
      .pipe(map((r) => r.data));
  }

  close(conversationId: string): Observable<ConversationDetail> {
    return this.http
      .patch<ApiWrapper<ConversationDetail>>(`${API_URL}/conversations/${conversationId}/close`, {})
      .pipe(map((r) => r.data));
  }

  transfer(
    conversationId: string,
    departmentId: string,
    queueId?: string,
    reason?: string,
  ): Observable<ConversationDetail> {
    return this.http
      .patch<ApiWrapper<ConversationDetail>>(`${API_URL}/conversations/${conversationId}/transfer`, {
        departmentId,
        queueId,
        reason,
      })
      .pipe(map((r) => r.data));
  }

  addNote(conversationId: string, content: string): Observable<InternalNote> {
    return this.http
      .post<ApiWrapper<InternalNote>>(`${API_URL}/conversations/${conversationId}/notes`, { content })
      .pipe(map((r) => r.data));
  }

  regenerateSummary(conversationId: string): Observable<string> {
    return this.http
      .post<ApiWrapper<string>>(`${API_URL}/bot/conversations/${conversationId}/summary`, {})
      .pipe(map((r) => r.data));
  }
}
