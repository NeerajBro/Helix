import { Component, inject, signal, OnInit } from '@angular/core';
import { OrganizationService } from '../../core/services/organization.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);

  protected readonly stats = signal({
    departments: 0,
    queues: 0,
    agentsOnline: 0,
    totalAgents: 0,
  });

  ngOnInit(): void {
    this.orgService.getDepartments().subscribe({
      next: (d) => this.stats.update((s) => ({ ...s, departments: d.length })),
    });
    this.orgService.getQueues().subscribe({
      next: (q) => this.stats.update((s) => ({ ...s, queues: q.length })),
    });
    this.orgService.getAvailabilitySummary().subscribe({
      next: (summary) =>
        this.stats.update((s) => ({
          ...s,
          agentsOnline: summary.byStatus['ONLINE'] ?? 0,
          totalAgents: summary.total,
        })),
    });
  }
}
