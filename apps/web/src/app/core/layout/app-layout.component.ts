import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getInitials } from '@helix/utils';
import { APP_NAME } from '@helix/shared';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  imports: [RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);

  protected readonly appName = APP_NAME;
  protected readonly user = this.authService.user;
  protected readonly sidebarCollapsed = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Administration', route: '/admin', icon: 'settings' },
  ];

  ngOnInit(): void {
    // Layout ready
  }

  protected getInitials(): string {
    const u = this.user();
    if (!u) return '?';
    return getInitials(u.firstName, u.lastName);
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}
