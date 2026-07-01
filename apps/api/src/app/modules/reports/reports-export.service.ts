import { Injectable } from '@nestjs/common';

export interface CsvColumn {
  key: string;
  header: string;
}

@Injectable()
export class ReportsExportService {
  toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
    const header = columns.map((c) => this.escapeCsv(c.header)).join(',');
    const lines = rows.map((row) =>
      columns.map((c) => this.escapeCsv(String(row[c.key] ?? ''))).join(','),
    );
    return `\uFEFF${[header, ...lines].join('\r\n')}`;
  }

  getContentType(format: 'csv' | 'xlsx'): string {
    return format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv; charset=utf-8';
  }

  getFileExtension(format: 'csv' | 'xlsx'): string {
    return format === 'xlsx' ? 'xlsx' : 'csv';
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
