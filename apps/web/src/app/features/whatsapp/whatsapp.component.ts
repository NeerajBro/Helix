import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { WhatsAppNumberDto } from '@helix/types';

@Component({
  selector: 'app-whatsapp',
  imports: [RouterLink],
  templateUrl: './whatsapp.component.html',
  styleUrl: './whatsapp.component.scss',
})
export class WhatsAppComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly loading = signal(true);
  protected readonly numbers = signal<WhatsAppNumberDto[]>([]);

  ngOnInit(): void {
    this.adminService.getWhatsAppNumbers().subscribe({
      next: (data) => {
        this.numbers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected qualityLabel(n: WhatsAppNumberDto): string {
    if (!n.isActive) return 'Inactive';
    return n.isDefault ? 'High' : 'Medium';
  }

  protected qualityColor(n: WhatsAppNumberDto): string {
    if (!n.isActive) return '#9e9e9e';
    return n.isDefault ? '#4caf50' : '#ff9800';
  }

  protected tierLabel(n: WhatsAppNumberDto): string {
    return n.isDefault ? 'Tier 2 (10K/day)' : 'Tier 1 (1K/day)';
  }
}
