import { Injectable } from '@nestjs/common';
import { BookingDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BookingAdapter } from './booking.adapter';

@Injectable()
export class PrismaBookingAdapter implements BookingAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async findByReference(reference: string): Promise<BookingDto | null> {
    const booking = await this.prisma.booking.findFirst({
      where: { reference: reference.toUpperCase(), deletedAt: null },
    });
    return booking ? this.mapBooking(booking) : null;
  }

  async findByCustomerId(customerId: string): Promise<BookingDto[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    return bookings.map((b) => this.mapBooking(b));
  }

  private mapBooking(booking: {
    id: string;
    customerId: string;
    type: string;
    reference: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    amount: { toNumber(): number } | null;
    currency: string | null;
  }): BookingDto {
    return {
      id: booking.id,
      customerId: booking.customerId,
      type: booking.type,
      reference: booking.reference,
      description: booking.description ?? undefined,
      status: booking.status,
      startDate: booking.startDate?.toISOString(),
      endDate: booking.endDate?.toISOString(),
      amount: booking.amount ? booking.amount.toNumber() : undefined,
      currency: booking.currency ?? undefined,
    };
  }
}
