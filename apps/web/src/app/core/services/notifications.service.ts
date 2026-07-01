import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { NotificationDto } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  list(): Observable<NotificationDto[]> {
    return this.http
      .get<ApiWrapper<NotificationDto[]>>(`${API_URL}/notifications`)
      .pipe(map((r) => r.data));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<ApiWrapper<number>>(`${API_URL}/notifications/unread-count`)
      .pipe(map((r) => r.data));
  }

  markRead(id: string): Observable<NotificationDto> {
    return this.http
      .patch<ApiWrapper<NotificationDto>>(`${API_URL}/notifications/${id}/read`, {})
      .pipe(map((r) => r.data));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http
      .patch<ApiWrapper<{ updated: number }>>(`${API_URL}/notifications/read-all`, {})
      .pipe(map((r) => r.data));
  }
}
