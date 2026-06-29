import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DashboardStats } from '@helix/types';

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
}
