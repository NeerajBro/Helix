import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CustomersService, CustomerListItem } from '../../core/services/customers.service';

@Component({
  selector: 'app-contacts',
  imports: [FormsModule, DatePipe],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss',
})
export class ContactsComponent implements OnInit {
  private readonly customersService = inject(CustomersService);

  protected readonly loading = signal(true);
  protected readonly contacts = signal<CustomerListItem[]>([]);
  protected readonly search = signal('');
  protected readonly total = signal(0);

  ngOnInit(): void {
    this.load();
  }

  protected onSearch(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const q = this.search().trim();
    this.customersService.list(1, 100, q || undefined).subscribe({
      next: (res) => {
        this.contacts.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
