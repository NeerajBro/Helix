import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { BookingQueryDto } from './dto/booking.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List bookings (optional reference filter)' })
  findAll(@Query() query: BookingQueryDto & { page?: number; pageSize?: number }) {
    return this.bookingsService.findAll(query);
  }

  @Get('lookup')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Lookup booking by reference' })
  lookup(@Query('reference') reference: string) {
    return this.bookingsService.lookup(reference);
  }

  @Get('customers/:customerId')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List bookings for a customer' })
  findByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.bookingsService.findByCustomer(customerId);
  }
}
