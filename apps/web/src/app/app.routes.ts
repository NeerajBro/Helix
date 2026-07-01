import { Route } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./features/inbox/inbox.component').then((m) => m.InboxComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'bot',
        loadComponent: () =>
          import('./features/bot/bot-studio.component').then((m) => m.BotStudioComponent),
      },
      {
        path: 'outreach',
        loadComponent: () =>
          import('./features/outreach/outreach.component').then((m) => m.OutreachComponent),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contacts.component').then((m) => m.ContactsComponent),
      },
      {
        path: 'whatsapp',
        loadComponent: () =>
          import('./features/whatsapp/whatsapp.component').then((m) => m.WhatsAppComponent),
      },
      {
        path: 'help',
        loadComponent: () =>
          import('./features/help/help.component').then((m) => m.HelpComponent),
      },
      {
        path: 'simulator',
        loadComponent: () =>
          import('./features/simulator/simulator.component').then((m) => m.SimulatorComponent),
      },
      {
        path: 'admin',
        redirectTo: 'settings/users',
        pathMatch: 'full',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          {
            path: ':section',
            loadComponent: () =>
              import('./features/admin/admin.component').then((m) => m.AdminComponent),
          },
        ],
      },
    ],
  },
];
