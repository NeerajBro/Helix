import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get real-time dashboard KPI stats' })
  getStats() {
    return this.dashboardService.getStats();
  }
}
