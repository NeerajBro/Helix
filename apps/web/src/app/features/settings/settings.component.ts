import { Component } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';

interface SettingsNavGroup {
  title: string;
  items: { label: string; route: string; icon: string }[];
}

@Component({
  selector: 'app-settings',
  imports: [RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  protected readonly navGroups: SettingsNavGroup[] = [
    {
      title: 'Platform Settings',
      items: [
        { label: 'Departments', route: 'departments', icon: 'corporate_fare' },
        { label: 'Users', route: 'users', icon: 'group' },
        { label: 'Roles', route: 'roles', icon: 'admin_panel_settings' },
        { label: 'Queues & SLA', route: 'queues', icon: 'schedule' },
        { label: 'Agent Availability', route: 'agents', icon: 'support_agent' },
        { label: 'Branding', route: 'branding', icon: 'palette' },
        { label: 'Audit Log', route: 'audit', icon: 'history' },
      ],
    },
    {
      title: 'Channel Settings',
      items: [
        { label: 'Message Templates', route: 'templates', icon: 'description' },
        { label: 'Campaigns', route: 'campaigns', icon: 'send' },
        { label: 'WhatsApp Numbers', route: 'whatsapp', icon: 'chat' },
      ],
    },
  ];
}
