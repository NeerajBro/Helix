import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { CustomerConversationHistoryItem, PaginatedResponse } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export interface CustomerListItem {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  language: string;
  timezone?: string;
  isVip: boolean;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
  conversationCount?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);

  list(page = 1, pageSize = 50, search?: string): Observable<PaginatedResponse<CustomerListItem>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    return this.http
      .get<ApiWrapper<PaginatedResponse<CustomerListItem>>>(`${API_URL}/customers?${params}`)
      .pipe(map((r) => r.data));
  }

  getConversationHistory(customerId: string): Observable<CustomerConversationHistoryItem[]> {
    return this.http
      .get<ApiWrapper<CustomerConversationHistoryItem[]>>(
        `${API_URL}/customers/${customerId}/conversations`,
      )
      .pipe(map((r) => r.data));
  }
}
