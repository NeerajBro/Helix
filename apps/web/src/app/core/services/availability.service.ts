import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export type AgentAvailabilityStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'ON_BREAK' | 'BUSY';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http = inject(HttpClient);

  getMyStatus(): Observable<{ status: AgentAvailabilityStatus; reason?: string; since: string }> {
    return this.http
      .get<ApiWrapper<{ status: AgentAvailabilityStatus; reason?: string; since: string }>>(
        `${API_URL}/availability/me`,
      )
      .pipe(map((r) => r.data));
  }

  updateStatus(status: AgentAvailabilityStatus, reason?: string): Observable<{ status: AgentAvailabilityStatus }> {
    return this.http
      .patch<ApiWrapper<{ status: AgentAvailabilityStatus }>>(`${API_URL}/availability/me`, {
        status,
        reason,
      })
      .pipe(map((r) => r.data));
  }
}
