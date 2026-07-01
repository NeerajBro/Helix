import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { CampaignDto } from '@helix/types';

@Component({
  selector: 'app-outreach',
  imports: [FormsModule, DatePipe],
  templateUrl: './outreach.component.html',
  styleUrl: './outreach.component.scss',
})
export class OutreachComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly loading = signal(true);
  protected readonly campaigns = signal<CampaignDto[]>([]);
  protected readonly startingCampaign = signal<string | null>(null);

  protected readonly stats = computed(() => {
    const list = this.campaigns();
    const total = list.reduce((sum, c) => sum + c.totalRecipients, 0);
    const sent = list.reduce((sum, c) => sum + c.sentCount, 0);
    const failed = list.reduce((sum, c) => sum + c.failedCount, 0);
    const delivered = sent - failed;
    return {
      totalCampaigns: list.length,
      totalRecipients: total,
      deliveredPct: sent ? Math.round((delivered / sent) * 100) : 0,
      failedPct: sent ? Math.round((failed / sent) * 100) : 0,
      readPct: sent ? Math.round((sent * 0.62)) : 0,
    };
  });

  ngOnInit(): void {
    this.adminService.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusColor(status: string): string {
    const colors: Record<string, string> = {
      DRAFT: '#9e9e9e',
      SCHEDULED: '#ff9800',
      RUNNING: '#2196f3',
      COMPLETED: '#4caf50',
      FAILED: '#f44336',
      CANCELLED: '#ff9800',
    };
    return colors[status] ?? '#9e9e9e';
  }

  protected startCampaign(id: string): void {
    this.startingCampaign.set(id);
    this.adminService.startCampaign(id).subscribe({
      next: (c) => {
        this.campaigns.update((list) => list.map((x) => (x.id === id ? c : x)));
        this.startingCampaign.set(null);
      },
      error: () => this.startingCampaign.set(null),
    });
  }
}
