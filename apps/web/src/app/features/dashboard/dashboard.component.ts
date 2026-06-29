import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { DashboardService } from '../../core/services/dashboard.service';
import { SocketService } from '../../core/services/socket.service';
import { AgentPerformance, DashboardAnalytics, DashboardStats } from '@helix/types';

@Component({
  selector: 'app-dashboard',
  imports: [ChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly socketService = inject(SocketService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly analytics = signal<DashboardAnalytics | null>(null);
  protected readonly loadingAnalytics = signal(true);
  protected readonly live = this.socketService.connected;
  protected readonly trendDays = signal(7);

  protected readonly trendChart = computed(() => ({
    chart: { type: 'area' as const, height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#1565c0', '#2e7d32', '#7b1fa2'],
    dataLabels: { enabled: false } as ApexDataLabels,
    stroke: { curve: 'smooth' as const, width: 2 } as ApexStroke,
    xaxis: {
      categories: this.analytics()?.trends.map((t) => t.date.slice(5)) ?? [],
    } as ApexXAxis,
    yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } } as ApexYAxis,
    legend: { position: 'top' as const } as ApexLegend,
  }));

  protected readonly trendSeries = computed(
    (): ApexAxisChartSeries => [
      { name: 'Opened', data: this.analytics()?.trends.map((t) => t.opened) ?? [] },
      { name: 'Resolved', data: this.analytics()?.trends.map((t) => t.resolved) ?? [] },
      { name: 'Messages', data: this.analytics()?.trends.map((t) => t.messages) ?? [] },
    ],
  );

  protected readonly deptChart = computed(() => ({
    chart: { type: 'donut' as const, height: 320, fontFamily: 'Inter, sans-serif' },
    labels: this.analytics()?.departmentDistribution.map((d) => d.departmentName) ?? [],
    colors: this.analytics()?.departmentDistribution.map((d) => d.color) ?? [],
    legend: { position: 'bottom' as const } as ApexLegend,
    dataLabels: { enabled: true } as ApexDataLabels,
    plotOptions: {
      pie: { donut: { size: '55%' } },
    } as ApexPlotOptions,
  }));

  protected readonly deptSeries = computed(
    (): ApexNonAxisChartSeries =>
      this.analytics()?.departmentDistribution.map((d) => d.count) ?? [],
  );

  protected readonly agentChart = computed(() => ({
    chart: { type: 'bar' as const, height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#1565c0'],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: '60%' },
    } as ApexPlotOptions,
    dataLabels: { enabled: true, formatter: (v: number) => `${v}%` } as ApexDataLabels,
    xaxis: {
      categories: this.analytics()?.agentPerformance.map((a) => a.agentName.split(' ')[0]) ?? [],
      max: 100,
    } as ApexXAxis,
  }));

  protected readonly agentSeries = computed(
    (): ApexAxisChartSeries => [
      {
        name: 'Utilization',
        data: this.analytics()?.agentPerformance.map((a) => a.utilization) ?? [],
      },
    ],
  );

  protected readonly topAgents = computed(
    () => this.analytics()?.agentPerformance.slice(0, 8) ?? [],
  );

  constructor() {
    effect(() => {
      const liveStats = this.socketService.dashboardStats();
      if (liveStats) {
        this.stats.set(liveStats);
        this.loadAnalytics(this.trendDays());
      }
    });
  }

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => this.stats.set(res.data),
    });
    this.loadAnalytics(this.trendDays());
  }

  ngOnDestroy(): void {
    // Socket lifecycle is managed by the app layout.
  }

  protected setTrendDays(days: number): void {
    this.trendDays.set(days);
    this.loadAnalytics(days);
  }

  protected agentStatusClass(agent: AgentPerformance): string {
    return agent.status.toLowerCase();
  }

  private loadAnalytics(days: number): void {
    this.loadingAnalytics.set(true);
    this.dashboardService.getAnalytics(days).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loadingAnalytics.set(false);
      },
      error: () => this.loadingAnalytics.set(false),
    });
  }
}
