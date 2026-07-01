import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe, JsonPipe } from '@angular/common';
import { OrganizationService } from '../../core/services/organization.service';
import { AdminService } from '../../core/services/admin.service';
import {
  AuditLogDto,
  CampaignDto,
  DepartmentDto,
  QueueDto,
  RoleDto,
  SkillDto,
  AgentAvailabilityDto,
  TemplateDto,
  UserDto,
  WhatsAppNumberDto,
  WhiteLabelSettings,
} from '@helix/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SECTION_INDEX: Record<string, number> = {
  users: 0,
  roles: 1,
  departments: 2,
  queues: 3,
  templates: 4,
  campaigns: 5,
  whatsapp: 6,
  audit: 7,
  branding: 8,
  agents: 9,
};

const SECTION_TITLES: Record<string, string> = {
  users: 'Users',
  roles: 'Roles',
  departments: 'Departments',
  queues: 'Queues & SLA',
  templates: 'Message Templates',
  campaigns: 'Campaigns',
  whatsapp: 'WhatsApp Numbers',
  audit: 'Audit Log',
  branding: 'Branding',
  agents: 'Agent Availability',
};

@Component({
  selector: 'app-admin',
  imports: [FormsModule, MatTabsModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule, DatePipe, JsonPipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  protected readonly section = signal<string | null>(null);
  protected readonly sectionTitle = computed(() => {
    const key = this.section();
    return key ? (SECTION_TITLES[key] ?? 'Settings') : 'Administration';
  });
  protected readonly selectedTabIndex = computed(() => {
    const key = this.section();
    return key ? (SECTION_INDEX[key] ?? 0) : 0;
  });
  protected readonly hideTabs = computed(() => !!this.section());

  protected readonly loading = signal(true);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly skills = signal<SkillDto[]>([]);
  protected readonly queues = signal<QueueDto[]>([]);
  protected readonly availability = signal<AgentAvailabilityDto[]>([]);
  protected readonly availSummary = signal<Record<string, number>>({});
  protected readonly users = signal<UserDto[]>([]);
  protected readonly roles = signal<RoleDto[]>([]);
  protected readonly templates = signal<TemplateDto[]>([]);
  protected readonly whatsappNumbers = signal<WhatsAppNumberDto[]>([]);
  protected readonly campaigns = signal<CampaignDto[]>([]);
  protected readonly auditLogs = signal<AuditLogDto[]>([]);
  protected readonly whiteLabel = signal<WhiteLabelSettings | null>(null);
  protected readonly savingBrand = signal(false);
  protected readonly startingCampaign = signal<string | null>(null);

  protected readonly newTemplateName = signal('');
  protected readonly newTemplateSlug = signal('');
  protected readonly newTemplateBody = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.section.set(params.get('section'));
    });
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
      APPROVED: '#4caf50',
      DRAFT: '#9e9e9e',
      RUNNING: '#2196f3',
      COMPLETED: '#4caf50',
      FAILED: '#f44336',
      CANCELLED: '#ff9800',
    };
    return colors[status] ?? '#9e9e9e';
  }

  protected saveWhiteLabel(): void {
    const wl = this.whiteLabel();
    if (!wl) return;
    this.savingBrand.set(true);
    this.adminService.updateWhiteLabel(wl).subscribe({
      next: (updated) => {
        this.whiteLabel.set(updated);
        this.savingBrand.set(false);
      },
      error: () => this.savingBrand.set(false),
    });
  }

  protected createTemplate(): void {
    const name = this.newTemplateName().trim();
    const slug = this.newTemplateSlug().trim();
    const body = this.newTemplateBody().trim();
    if (!name || !slug || !body) return;

    this.adminService.createTemplate({ name, slug, body, category: 'UTILITY' }).subscribe({
      next: (t) => {
        this.templates.update((list) => [...list, t]);
        this.newTemplateName.set('');
        this.newTemplateSlug.set('');
        this.newTemplateBody.set('');
      },
    });
  }

  protected startCampaign(id: string): void {
    this.startingCampaign.set(id);
    this.adminService.startCampaign(id).subscribe({
      next: (c) => {
        this.campaigns.update((list) => list.map((x) => (x.id === id ? c : x)));
        this.startingCampaign.set(null);
        setTimeout(() => this.refreshCampaigns(), 2000);
      },
      error: () => this.startingCampaign.set(null),
    });
  }

  private refreshCampaigns(): void {
    this.adminService.getCampaigns().subscribe({
      next: (data) => this.campaigns.set(data),
    });
  }

  private loadData(): void {
    this.loading.set(true);

    this.orgService.getDepartments().subscribe({ next: (d) => this.departments.set(d) });
    this.orgService.getSkills().subscribe({ next: (d) => this.skills.set(d) });
    this.orgService.getQueues().subscribe({ next: (d) => this.queues.set(d) });
    this.orgService.getAvailabilitySummary().subscribe({
      next: (d) => this.availSummary.set(d.byStatus),
    });
    this.orgService.getAvailability().subscribe({
      next: (d) => {
        this.availability.set(d);
        this.loading.set(false);
      },
    });

    this.adminService.getUsers().subscribe({ next: (r) => this.users.set(r.items) });
    this.adminService.getRoles().subscribe({ next: (r) => this.roles.set(r) });
    this.adminService.getTemplates().subscribe({ next: (r) => this.templates.set(r) });
    this.adminService.getWhatsAppNumbers().subscribe({ next: (r) => this.whatsappNumbers.set(r) });
    this.adminService.getCampaigns().subscribe({ next: (r) => this.campaigns.set(r) });
    this.adminService.getAuditLogs().subscribe({ next: (r) => this.auditLogs.set(r.items) });
    this.adminService.getWhiteLabel().subscribe({ next: (r) => this.whiteLabel.set(r) });
  }
}
