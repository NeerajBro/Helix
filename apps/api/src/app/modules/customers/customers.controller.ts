import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List customers' })
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/timeline')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get customer activity timeline' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getTimeline(id);
  }

  @Post()
  @RequirePermissions('conversations:create')
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('conversations:delete')
  @ApiOperation({ summary: 'Soft delete customer' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }
}
