import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class ConversationReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ExportReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ enum: ['departments', 'agents', 'conversations', 'csat', 'sla'] })
  @IsString()
  @IsIn(['departments', 'agents', 'conversations', 'csat', 'sla'])
  type!: 'departments' | 'agents' | 'conversations' | 'csat' | 'sla';

  @ApiPropertyOptional({ enum: ['csv', 'xlsx'] })
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx';
}
