import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ReportsBundle } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export interface ReportFilters {
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  getBundle(filters: ReportFilters = {}): Observable<ReportsBundle> {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const qs = params.toString();
    return this.http
      .get<ApiWrapper<ReportsBundle>>(`${API_URL}/reports${qs ? `?${qs}` : ''}`)
      .pipe(map((r) => r.data));
  }

  exportReport(
    type: 'departments' | 'agents' | 'conversations' | 'csat' | 'sla',
    filters: ReportFilters = {},
    format: 'csv' | 'xlsx' = 'csv',
  ): Observable<Blob> {
    const params = new URLSearchParams({ type, format });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return this.http.get(`${API_URL}/reports/export?${params}`, {
      responseType: 'blob',
    });
  }

  downloadExport(
    type: 'departments' | 'agents' | 'conversations' | 'csat' | 'sla',
    filters: ReportFilters = {},
  ): void {
    this.exportReport(type, filters).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
