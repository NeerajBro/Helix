import { Global, Module } from '@nestjs/common';
import { BOOKING_ADAPTER } from './booking.adapter';
import { PrismaBookingAdapter } from './prisma-booking.adapter';

@Global()
@Module({
  providers: [
    PrismaBookingAdapter,
    {
      provide: BOOKING_ADAPTER,
      useExisting: PrismaBookingAdapter,
    },
  ],
  exports: [BOOKING_ADAPTER],
})
export class BookingAdapterModule {}
