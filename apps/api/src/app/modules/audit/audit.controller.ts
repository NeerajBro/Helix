import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List audit logs (paginated)' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findAll({ page, pageSize, action, entityType, userId });
  }
}
