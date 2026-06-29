import { Component, inject, signal, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { OrganizationService } from '../../core/services/organization.service';
import {
  DepartmentDto,
  SkillDto,
  QueueDto,
  AgentAvailabilityDto,
} from '@helix/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-admin',
  imports: [MatTabsModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);

  protected readonly loading = signal(true);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly skills = signal<SkillDto[]>([]);
  protected readonly queues = signal<QueueDto[]>([]);
  protected readonly availability = signal<AgentAvailabilityDto[]>([]);
  protected readonly availSummary = signal<Record<string, number>>({});

  ngOnInit(): void {
    this.loadData();
  }

  protected dayName(day: number): string {
    return DAY_NAMES[day] ?? `Day ${day}`;
  }

  protected statusColor(status: string): string {
    const colors: Record<string, string> = {
      ONLINE: '#4caf50',
      OFFLINE: '#9e9e9e',
      AWAY: '#ff9800',
      ON_BREAK: '#2196f3',
      BUSY: '#f44336',
    };
    return colors[status] ?? '#9e9e9e';
  }

  private loadData(): void {
    this.loading.set(true);

    this.orgService.getDepartments().subscribe({
      next: (data) => this.departments.set(data),
    });
    this.orgService.getSkills().subscribe({
      next: (data) => this.skills.set(data),
    });
    this.orgService.getQueues().subscribe({
      next: (data) => this.queues.set(data),
    });
    this.orgService.getAvailability().subscribe({
      next: (data) => {
        this.availability.set(data);
        this.loading.set(false);
      },
    });
    this.orgService.getAvailabilitySummary().subscribe({
      next: (data) => this.availSummary.set(data.byStatus),
    });
  }
}
