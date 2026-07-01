import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { SocketService } from '../services/socket.service';
import { AvailabilityService, AgentAvailabilityStatus } from '../services/availability.service';
import { NotificationsService } from '../services/notifications.service';
import { getInitials } from '@helix/utils';
import { APP_NAME } from '@helix/shared';
import { NotificationDto } from '@helix/types';
import { Subscription } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

const MOOD_OPTIONS: { value: AgentAvailabilityStatus; label: string }[] = [
  { value: 'ONLINE', label: 'Happy to help' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'AWAY', label: 'Away' },
  { value: 'ON_BREAK', label: 'On break' },
  { value: 'OFFLINE', label: 'Offline' },
];

@Component({
  selector: 'app-layout',
  imports: [RouterModule, RouterLink, RouterLinkActive, FormsModule, DatePipe],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly notificationsService = inject(NotificationsService);

  protected readonly appName = APP_NAME;
  protected readonly user = this.authService.user;
  protected readonly sidebarCollapsed = signal(true);
  protected readonly agentStatus = signal<AgentAvailabilityStatus>('ONLINE');
  protected readonly moodOptions = MOOD_OPTIONS;
  protected readonly notifications = signal<NotificationDto[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly showNotifications = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid_view', exact: true },
    { label: 'Live Chats', route: '/inbox', icon: 'forum' },
    { label: 'Reports', route: '/reports', icon: 'bar_chart' },
    { label: 'Bot Studio', route: '/bot', icon: 'smart_toy' },
    { label: 'Outreach', route: '/outreach', icon: 'campaign' },
    { label: 'Contacts', route: '/contacts', icon: 'contacts' },
    { label: 'WhatsApp', route: '/whatsapp', icon: 'chat' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  protected readonly bottomNavItems: NavItem[] = [
    { label: 'Simulator', route: '/simulator', icon: 'phone_iphone' },
    { label: 'Help', route: '/help', icon: 'headset_mic' },
  ];

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.socketService.connect();
    this.loadAvailability();
    this.loadNotifications();
    this.subs.push(
      this.socketService.onNotificationNew().subscribe(() => {
        this.loadNotifications();
      }),
      this.socketService.onSlaBreach().subscribe(() => {
        this.loadNotifications();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.socketService.disconnect();
  }

  protected getInitials(): string {
    const u = this.user();
    if (!u) return '?';
    return getInitials(u.firstName, u.lastName);
  }

  protected formatRole(role?: string): string {
    if (!role) return 'Agent';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  protected logout(): void {
    this.socketService.disconnect();
    this.authService.logout();
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  protected onStatusChange(status: AgentAvailabilityStatus): void {
    this.availabilityService.updateStatus(status).subscribe({
      next: (res) => this.agentStatus.set(res.status),
    });
  }

  protected toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
    if (this.showNotifications()) {
      this.notificationsService.markAllRead().subscribe(() => this.unreadCount.set(0));
    }
  }

  protected statusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  private loadAvailability(): void {
    this.availabilityService.getMyStatus().subscribe({
      next: (res) => this.agentStatus.set(res.status),
      error: () => this.agentStatus.set('ONLINE'),
    });
  }

  private loadNotifications(): void {
    this.notificationsService.list().subscribe({
      next: (items) => this.notifications.set(items),
    });
    this.notificationsService.unreadCount().subscribe({
      next: (count) => this.unreadCount.set(count),
    });
  }
}
