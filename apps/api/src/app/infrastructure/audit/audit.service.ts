import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditLogDto } from '@helix/types';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues: input.oldValues as Prisma.InputJsonValue,
        newValues: input.newValues as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    action?: AuditAction;
    entityType?: string;
    userId?: string;
  }) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const where = {
      ...(query.action && { action: query.action }),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.userId && { userId: query.userId }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogDto[] = logs.map((l) => ({
      id: l.id,
      userId: l.userId ?? undefined,
      userName: l.user
        ? `${l.user.firstName} ${l.user.lastName}`
        : undefined,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId ?? undefined,
      oldValues: l.oldValues as Record<string, unknown> | undefined,
      newValues: l.newValues as Record<string, unknown> | undefined,
      ipAddress: l.ipAddress ?? undefined,
      createdAt: l.createdAt.toISOString(),
    }));

    return buildPaginatedResponse(items, total, page, pageSize);
  }
}
