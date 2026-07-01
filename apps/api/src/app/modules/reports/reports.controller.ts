import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsExportService } from './reports-export.service';
import {
  ConversationReportQueryDto,
  ExportReportQueryDto,
  ReportQueryDto,
} from './dto/reports.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ReportsExportService,
  ) {}

  @Get()
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Full reports bundle for date range' })
  getBundle(@Query() query: ReportQueryDto) {
    return this.reportsService.getBundle(query);
  }

  @Get('summary')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reports summary KPIs' })
  async getSummary(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getSummary(new Date(range.from), new Date(range.to));
  }

  @Get('departments')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Department performance report' })
  async getDepartments(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getDepartmentReport(new Date(range.from), new Date(range.to));
  }

  @Get('agents')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Agent performance report' })
  async getAgents(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getAgentReport(new Date(range.from), new Date(range.to));
  }

  @Get('conversations')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Conversation report (paginated)' })
  getConversations(@Query() query: ConversationReportQueryDto) {
    return this.reportsService.getConversationReport(query);
  }

  @Get('bot')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Bot handoff and intent report' })
  async getBot(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getBotReport(new Date(range.from), new Date(range.to));
  }

  @Get('sla')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'SLA compliance report' })
  async getSla(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getSlaReport(new Date(range.from), new Date(range.to));
  }

  @Get('csat')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'CSAT satisfaction report' })
  async getCsat(@Query() query: ReportQueryDto) {
    const range = this.reportsService.parseRange(query);
    return this.reportsService.getCsatReport(new Date(range.from), new Date(range.to));
  }

  @Get('export')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Export report as CSV (Excel-compatible)' })
  async export(@Query() query: ExportReportQueryDto, @Res() res: Response) {
    const range = this.reportsService.parseRange(query);
    const from = new Date(range.from);
    const to = new Date(range.to);
    const format = query.format ?? 'csv';

    let csv: string;
    let filename: string;

    switch (query.type) {
      case 'departments': {
        const rows = await this.reportsService.getDepartmentReport(from, to);
        csv = this.exportService.toCsv(rows as unknown as Record<string, unknown>[], [
          { key: 'departmentName', header: 'Department' },
          { key: 'total', header: 'Total' },
          { key: 'resolved', header: 'Resolved' },
          { key: 'open', header: 'Open' },
          { key: 'avgFirstResponseMinutes', header: 'Avg First Response (min)' },
          { key: 'slaBreached', header: 'SLA Breached' },
          { key: 'csatAverage', header: 'CSAT Avg' },
        ]);
        filename = `departments-report`;
        break;
      }
      case 'agents': {
        const rows = await this.reportsService.getAgentReport(from, to);
        csv = this.exportService.toCsv(rows as unknown as Record<string, unknown>[], [
          { key: 'agentName', header: 'Agent' },
          { key: 'departmentName', header: 'Department' },
          { key: 'assigned', header: 'Assigned' },
          { key: 'resolved', header: 'Resolved' },
          { key: 'avgFirstResponseMinutes', header: 'Avg First Response (min)' },
          { key: 'avgResolutionMinutes', header: 'Avg Resolution (min)' },
          { key: 'csatAverage', header: 'CSAT Avg' },
        ]);
        filename = `agents-report`;
        break;
      }
      case 'conversations': {
        const result = await this.reportsService.getConversationReport({
          ...query,
          page: 1,
          pageSize: 1000,
        });
        csv = this.exportService.toCsv(result.items as unknown as Record<string, unknown>[], [
          { key: 'customerPhone', header: 'Phone' },
          { key: 'customerName', header: 'Customer' },
          { key: 'status', header: 'Status' },
          { key: 'departmentName', header: 'Department' },
          { key: 'agentName', header: 'Agent' },
          { key: 'slaBreached', header: 'SLA Breached' },
          { key: 'csatRating', header: 'CSAT' },
          { key: 'createdAt', header: 'Created' },
          { key: 'resolvedAt', header: 'Resolved' },
        ]);
        filename = `conversations-report`;
        break;
      }
      case 'csat': {
        const report = await this.reportsService.getCsatReport(from, to);
        csv = this.exportService.toCsv(report.recent as unknown as Record<string, unknown>[], [
          { key: 'customerName', header: 'Customer' },
          { key: 'agentName', header: 'Agent' },
          { key: 'rating', header: 'Rating' },
          { key: 'comment', header: 'Comment' },
          { key: 'createdAt', header: 'Submitted' },
        ]);
        filename = `csat-report`;
        break;
      }
      case 'sla': {
        const report = await this.reportsService.getSlaReport(from, to);
        csv = this.exportService.toCsv(
          report.recentBreaches as unknown as Record<string, unknown>[],
          [
            { key: 'customerPhone', header: 'Phone' },
            { key: 'departmentName', header: 'Department' },
            { key: 'breachType', header: 'Breach Type' },
            { key: 'minutesOverdue', header: 'Minutes Overdue' },
            { key: 'breachedAt', header: 'Breached At' },
          ],
        );
        filename = `sla-breaches-report`;
        break;
      }
      default:
        csv = '';
        filename = 'report';
    }

    const ext = this.exportService.getFileExtension(format);
    res.setHeader('Content-Type', this.exportService.getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
    res.send(csv);
  }
}
