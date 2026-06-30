import { BookingDto } from '@helix/types';

export interface BookingAdapter {
  findByReference(reference: string): Promise<BookingDto | null>;
  findByCustomerId(customerId: string): Promise<BookingDto[]>;
}

export const BOOKING_ADAPTER = Symbol('BOOKING_ADAPTER');
