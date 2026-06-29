import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateBusinessHourDto,
  UpdateBusinessHourDto,
} from './dto/department.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'List all departments' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('departments:create')
  @ApiOperation({ summary: 'Create department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('departments:update')
  @ApiOperation({ summary: 'Update department' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments:delete')
  @ApiOperation({ summary: 'Soft delete department' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.remove(id);
  }

  @Get(':id/business-hours')
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'Get department business hours' })
  getBusinessHours(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.getBusinessHours(id);
  }

  @Post(':id/business-hours')
  @RequirePermissions('departments:update')
  @ApiOperation({ summary: 'Add business hour to department' })
  addBusinessHour(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBusinessHourDto,
  ) {
    return this.departmentsService.addBusinessHour(id, dto);
  }

  @Patch(':id/business-hours/:hourId')
  @RequirePermissions('departments:update')
  @ApiOperation({ summary: 'Update business hour' })
  updateBusinessHour(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hourId', ParseUUIDPipe) hourId: string,
    @Body() dto: UpdateBusinessHourDto,
  ) {
    return this.departmentsService.updateBusinessHour(id, hourId, dto);
  }

  @Delete(':id/business-hours/:hourId')
  @RequirePermissions('departments:update')
  @ApiOperation({ summary: 'Remove business hour' })
  removeBusinessHour(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hourId', ParseUUIDPipe) hourId: string,
  ) {
    return this.departmentsService.removeBusinessHour(id, hourId);
  }
}
