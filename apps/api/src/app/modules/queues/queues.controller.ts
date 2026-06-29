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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto, CalculatePriorityDto } from './dto/queue.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('queues')
@ApiBearerAuth()
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get()
  @RequirePermissions('queues:read')
  @ApiOperation({ summary: 'List all queues' })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.queuesService.findAll(departmentId);
  }

  @Get(':id')
  @RequirePermissions('queues:read')
  @ApiOperation({ summary: 'Get queue by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.findOne(id);
  }

  @Post()
  @RequirePermissions('queues:create')
  @ApiOperation({ summary: 'Create queue' })
  create(@Body() dto: CreateQueueDto) {
    return this.queuesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('queues:update')
  @ApiOperation({ summary: 'Update queue' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQueueDto) {
    return this.queuesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('queues:delete')
  @ApiOperation({ summary: 'Soft delete queue' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.remove(id);
  }

  @Post('calculate-priority')
  @RequirePermissions('queues:read')
  @ApiOperation({ summary: 'Calculate conversation priority score' })
  calculatePriority(@Body() dto: CalculatePriorityDto) {
    return this.queuesService.calculatePriority(dto);
  }

  @Post(':id/route')
  @RequirePermissions('queues:update')
  @ApiOperation({ summary: 'Select next available agent for queue' })
  routeNextAgent(@Param('id', ParseUUIDPipe) id: string) {
    return this.queuesService.routeNextAgent(id);
  }
}
