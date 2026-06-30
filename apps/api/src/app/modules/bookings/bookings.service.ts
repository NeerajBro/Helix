import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookingDto } from '@helix/types';
import { BOOKING_ADAPTER, BookingAdapter } from '../../adapters/booking/booking.adapter';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BookingQueryDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOOKING_ADAPTER) private readonly bookingAdapter: BookingAdapter,
  ) {}

  async findAll(query: BookingQueryDto & { page?: number; pageSize?: number }) {
    const { skip, take, page, pageSize } = parsePagination(query);

    if (query.reference) {
      const booking = await this.bookingAdapter.findByReference(query.reference);
      const items = booking ? [booking] : [];
      return buildPaginatedResponse(items, items.length, page, pageSize);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: { deletedAt: null } }),
    ]);

    const items = bookings.map((b) => this.mapBooking(b));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async lookup(reference: string): Promise<BookingDto> {
    const booking = await this.bookingAdapter.findByReference(reference);
    if (!booking) {
      throw new NotFoundException(`Booking ${reference} not found`);
    }
    return booking;
  }

  async findByCustomer(customerId: string): Promise<BookingDto[]> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
    return this.bookingAdapter.findByCustomerId(customerId);
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
