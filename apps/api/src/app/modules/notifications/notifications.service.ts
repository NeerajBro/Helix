import { Injectable } from '@nestjs/common';
import { NotificationDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string, limit = 30): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => this.map(n));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const updated = await this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return this.map(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  private map(n: {
    id: string;
    type: string;
    title: string;
    message: string;
    data: unknown;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: (n.data as Record<string, unknown>) ?? undefined,
      isRead: n.isRead,
      readAt: n.readAt?.toISOString(),
      createdAt: n.createdAt.toISOString(),
    };
  }
}
