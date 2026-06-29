import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardAnalyticsQueryDto } from './dto/dashboard.dto';
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

  @Get('analytics')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get dashboard charts and agent performance data' })
  getAnalytics(@Query() query: DashboardAnalyticsQueryDto) {
    return this.dashboardService.getAnalytics(query.days ?? 7);
  }
}
