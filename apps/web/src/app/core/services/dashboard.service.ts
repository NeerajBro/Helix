import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DashboardAnalytics, DashboardStats } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getStats() {
    return this.http.get<ApiWrapper<DashboardStats>>(`${API_URL}/dashboard/stats`);
  }

  getAnalytics(days = 7): Observable<DashboardAnalytics> {
    return this.http
      .get<ApiWrapper<DashboardAnalytics>>(`${API_URL}/dashboard/analytics?days=${days}`)
      .pipe(map((r) => r.data));
  }
}
