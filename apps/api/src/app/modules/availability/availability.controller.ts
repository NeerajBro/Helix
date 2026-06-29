import { Controller, Get, Patch, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto } from './dto/availability.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { JwtPayload } from '@helix/types';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all agent availability (supervisor)' })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.availabilityService.findAll(departmentId);
  }

  @Get('summary')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Availability summary by status' })
  getSummary() {
    return this.availabilityService.getSummary();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current agent availability' })
  getMyStatus(@CurrentUser() user: JwtPayload) {
    return this.availabilityService.getMyStatus(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current agent availability' })
  updateMyStatus(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAvailabilityDto) {
    return this.availabilityService.updateMyStatus(user.sub, dto);
  }

  @Post('me/break/start')
  @ApiOperation({ summary: 'Start break' })
  startBreak(@CurrentUser() user: JwtPayload, @Body() body: { reason?: string }) {
    return this.availabilityService.startBreak(user.sub, body.reason);
  }

  @Post('me/break/end')
  @ApiOperation({ summary: 'End break' })
  endBreak(@CurrentUser() user: JwtPayload) {
    return this.availabilityService.endBreak(user.sub);
  }
}
