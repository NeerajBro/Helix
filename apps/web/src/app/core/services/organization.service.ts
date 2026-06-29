import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  DepartmentDto,
  SkillDto,
  QueueDto,
  AgentAvailabilityDto,
  PriorityScoreBreakdown,
  PriorityInput,
} from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);

  getDepartments(): Observable<DepartmentDto[]> {
    return this.http
      .get<ApiWrapper<DepartmentDto[]>>(`${API_URL}/departments`)
      .pipe(map((r) => r.data));
  }

  getDepartment(id: string): Observable<DepartmentDto> {
    return this.http
      .get<ApiWrapper<DepartmentDto>>(`${API_URL}/departments/${id}`)
      .pipe(map((r) => r.data));
  }

  getSkills(): Observable<SkillDto[]> {
    return this.http
      .get<ApiWrapper<SkillDto[]>>(`${API_URL}/skills`)
      .pipe(map((r) => r.data));
  }

  getQueues(departmentId?: string): Observable<QueueDto[]> {
    const params = departmentId ? `?departmentId=${departmentId}` : '';
    return this.http
      .get<ApiWrapper<QueueDto[]>>(`${API_URL}/queues${params}`)
      .pipe(map((r) => r.data));
  }

  getAvailability(departmentId?: string): Observable<AgentAvailabilityDto[]> {
    const params = departmentId ? `?departmentId=${departmentId}` : '';
    return this.http
      .get<ApiWrapper<AgentAvailabilityDto[]>>(`${API_URL}/availability${params}`)
      .pipe(map((r) => r.data));
  }

  getAvailabilitySummary(): Observable<{ total: number; byStatus: Record<string, number> }> {
    return this.http
      .get<ApiWrapper<{ total: number; byStatus: Record<string, number> }>>(
        `${API_URL}/availability/summary`,
      )
      .pipe(map((r) => r.data));
  }

  calculatePriority(input: PriorityInput): Observable<PriorityScoreBreakdown> {
    return this.http
      .post<ApiWrapper<PriorityScoreBreakdown>>(`${API_URL}/queues/calculate-priority`, input)
      .pipe(map((r) => r.data));
  }
}
