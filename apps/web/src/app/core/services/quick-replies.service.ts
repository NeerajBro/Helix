import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { CannedResponseDto } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class QuickRepliesService {
  private readonly http = inject(HttpClient);

  list(departmentId?: string): Observable<CannedResponseDto[]> {
    const qs = departmentId ? `?departmentId=${departmentId}` : '';
    return this.http
      .get<ApiWrapper<CannedResponseDto[]>>(`${API_URL}/quick-replies${qs}`)
      .pipe(map((r) => r.data));
  }

  listAdmin(): Observable<CannedResponseDto[]> {
    return this.http
      .get<ApiWrapper<CannedResponseDto[]>>(`${API_URL}/quick-replies/admin`)
      .pipe(map((r) => r.data));
  }

  create(payload: {
    title: string;
    shortcut: string;
    content: string;
    departmentId?: string;
  }): Observable<CannedResponseDto> {
    return this.http
      .post<ApiWrapper<CannedResponseDto>>(`${API_URL}/quick-replies`, payload)
      .pipe(map((r) => r.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/quick-replies/${id}`);
  }
}
