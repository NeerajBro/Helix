import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { DashboardService } from '../../core/services/dashboard.service';
import { SocketService } from '../../core/services/socket.service';
import { DashboardStats } from '@helix/types';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly socketService = inject(SocketService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly live = this.socketService.connected;

  constructor() {
    effect(() => {
      const liveStats = this.socketService.dashboardStats();
      if (liveStats) {
        this.stats.set(liveStats);
      }
    });
  }

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => this.stats.set(res.data),
    });
  }

  ngOnDestroy(): void {
    // Socket lifecycle is managed by the app layout.
  }
}
