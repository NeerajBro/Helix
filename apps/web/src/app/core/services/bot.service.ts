import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

export interface BotIntentRule {
  intent: string;
  label: string;
  queueSlug: string;
  departmentSlug: string;
  keywords: string[];
}

@Injectable({ providedIn: 'root' })
export class BotService {
  private readonly http = inject(HttpClient);

  getIntents(): Observable<BotIntentRule[]> {
    return this.http
      .get<ApiWrapper<BotIntentRule[]>>(`${API_URL}/bot/intents`)
      .pipe(map((r) => r.data));
  }
}
