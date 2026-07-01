import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChartComponent } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { ReportsService } from '../../core/services/reports.service';
import { ReportsBundle } from '@helix/types';

type ReportTab = 'overview' | 'departments' | 'agents' | 'bot' | 'sla' | 'csat';
type ReportModule = 'team' | 'bot' | 'custom';

const MODULE_TABS: Record<ReportModule, ReportTab[]> = {
  team: ['overview', 'agents', 'departments', 'sla', 'csat'],
  bot: ['bot'],
  custom: ['overview', 'departments', 'agents', 'sla', 'csat'],
};

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DatePipe, ChartComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  protected readonly loading = signal(true);
  protected readonly data = signal<ReportsBundle | null>(null);
  protected readonly activeModule = signal<ReportModule>('team');
  protected readonly activeTab = signal<ReportTab>('overview');
  protected readonly rangeDays = signal(7);
  protected readonly customFrom = signal('');
  protected readonly customTo = signal('');

  protected readonly filters = computed(() => {
    if (this.customFrom() && this.customTo()) {
      return { from: this.customFrom(), to: this.customTo() };
    }
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - (this.rangeDays() - 1));
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  });

  protected readonly csatChart = computed(() => ({
    chart: { type: 'bar' as const, height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#1565c0'],
    xaxis: {
      categories: this.data()?.csat.distribution.map((d) => `${d.rating} ★`) ?? [],
    } as ApexXAxis,
    yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } } as ApexYAxis,
    dataLabels: { enabled: true } as ApexDataLabels,
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '50%' },
    } as ApexPlotOptions,
  }));

  protected readonly csatSeries = computed(
    (): ApexAxisChartSeries => [
      { name: 'Responses', data: this.data()?.csat.distribution.map((d) => d.count) ?? [] },
    ],
  );

  protected readonly botChart = computed(() => ({
    chart: { type: 'donut' as const, height: 280, fontFamily: 'Inter, sans-serif' },
    labels: this.data()?.bot.intentBreakdown.map((i) => i.intent) ?? [],
    legend: { position: 'bottom' as const } as ApexLegend,
    dataLabels: { enabled: true } as ApexDataLabels,
  }));

  protected readonly botSeries = computed(
    (): ApexNonAxisChartSeries =>
      this.data()?.bot.intentBreakdown.map((i) => i.count) ?? [],
  );

  protected readonly slaDeptChart = computed(() => ({
    chart: { type: 'bar' as const, height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#c62828'],
    xaxis: {
      categories: this.data()?.sla.byDepartment.map((d) => d.departmentName) ?? [],
    } as ApexXAxis,
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } } as ApexPlotOptions,
    dataLabels: { enabled: true } as ApexDataLabels,
  }));

  protected readonly slaDeptSeries = computed(
    (): ApexAxisChartSeries => [
      { name: 'Breaches', data: this.data()?.sla.byDepartment.map((d) => d.breached) ?? [] },
    ],
  );

  ngOnInit(): void {
    this.load();
  }

  protected setRange(days: number): void {
    this.rangeDays.set(days);
    this.customFrom.set('');
    this.customTo.set('');
    this.load();
  }

  protected applyCustomRange(): void {
    if (!this.customFrom() || !this.customTo()) return;
    this.load();
  }

  protected setModule(module: ReportModule): void {
    this.activeModule.set(module);
    this.activeTab.set(MODULE_TABS[module][0]);
  }

  protected setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  protected exportCurrentTab(): void {
    const tab = this.activeTab();
    if (tab === 'bot') return;
    const type = tab === 'overview' ? 'departments' : tab;
    if (type === 'departments' || type === 'agents' || type === 'csat' || type === 'sla') {
      this.reportsService.downloadExport(type, this.filters());
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.reportsService.getBundle(this.filters()).subscribe({
      next: (bundle) => {
        this.data.set(bundle);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
