import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsExportService } from './reports-export.service';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [SlaModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
