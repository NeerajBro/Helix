import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BookingDto } from '@helix/types';

const API_URL = '/api';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly http = inject(HttpClient);

  getByCustomer(customerId: string): Observable<BookingDto[]> {
    return this.http
      .get<ApiWrapper<BookingDto[]>>(`${API_URL}/bookings/customers/${customerId}`)
      .pipe(map((r) => r.data));
  }

  lookup(reference: string): Observable<BookingDto> {
    return this.http
      .get<ApiWrapper<BookingDto>>(`${API_URL}/bookings/lookup?reference=${encodeURIComponent(reference)}`)
      .pipe(map((r) => r.data));
  }
}
