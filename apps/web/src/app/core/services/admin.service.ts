import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AuditLogDto,
  CampaignDto,
  CampaignRecipientDto,
  PaginatedResponse,
  RoleDto,
  SettingDto,
  TemplateDto,
  UserDto,
  WhatsAppNumberDto,
  WhiteLabelSettings,
} from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getUsers(page = 1, pageSize = 20, search?: string): Observable<PaginatedResponse<UserDto>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    return this.http
      .get<ApiWrapper<PaginatedResponse<UserDto>>>(`${API_URL}/users?${params}`)
      .pipe(map((r) => r.data));
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http
      .get<ApiWrapper<RoleDto[]>>(`${API_URL}/roles`)
      .pipe(map((r) => r.data));
  }

  getTemplates(): Observable<TemplateDto[]> {
    return this.http
      .get<ApiWrapper<TemplateDto[]>>(`${API_URL}/templates`)
      .pipe(map((r) => r.data));
  }

  createTemplate(payload: {
    name: string;
    slug: string;
    body: string;
    category?: string;
    variables?: string[];
  }): Observable<TemplateDto> {
    return this.http
      .post<ApiWrapper<TemplateDto>>(`${API_URL}/templates`, payload)
      .pipe(map((r) => r.data));
  }

  getWhatsAppNumbers(): Observable<WhatsAppNumberDto[]> {
    return this.http
      .get<ApiWrapper<WhatsAppNumberDto[]>>(`${API_URL}/whatsapp-numbers`)
      .pipe(map((r) => r.data));
  }

  getCampaigns(): Observable<CampaignDto[]> {
    return this.http
      .get<ApiWrapper<CampaignDto[]>>(`${API_URL}/campaigns`)
      .pipe(map((r) => r.data));
  }

  getCampaignRecipients(campaignId: string): Observable<CampaignRecipientDto[]> {
    return this.http
      .get<ApiWrapper<CampaignRecipientDto[]>>(`${API_URL}/campaigns/${campaignId}/recipients`)
      .pipe(map((r) => r.data));
  }

  startCampaign(id: string): Observable<CampaignDto> {
    return this.http
      .post<ApiWrapper<CampaignDto>>(`${API_URL}/campaigns/${id}/start`, {})
      .pipe(map((r) => r.data));
  }

  getAuditLogs(page = 1): Observable<PaginatedResponse<AuditLogDto>> {
    return this.http
      .get<ApiWrapper<PaginatedResponse<AuditLogDto>>>(`${API_URL}/audit?page=${page}&pageSize=30`)
      .pipe(map((r) => r.data));
  }

  getSettings(): Observable<SettingDto[]> {
    return this.http
      .get<ApiWrapper<SettingDto[]>>(`${API_URL}/settings`)
      .pipe(map((r) => r.data));
  }

  getWhiteLabel(): Observable<WhiteLabelSettings> {
    return this.http
      .get<ApiWrapper<WhiteLabelSettings>>(`${API_URL}/settings/white-label`)
      .pipe(map((r) => r.data));
  }

  updateWhiteLabel(payload: Partial<WhiteLabelSettings>): Observable<WhiteLabelSettings> {
    return this.http
      .patch<ApiWrapper<WhiteLabelSettings>>(`${API_URL}/settings/white-label`, payload)
      .pipe(map((r) => r.data));
  }
}
