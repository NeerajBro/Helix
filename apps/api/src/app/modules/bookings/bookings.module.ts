import { Module } from '@nestjs/common';
import { BookingAdapterModule } from '../../adapters/booking/booking.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [BookingAdapterModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
