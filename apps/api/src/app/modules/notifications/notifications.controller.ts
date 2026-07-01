import { Controller, Get, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtPayload } from '@helix/types';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List notifications for current user' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findForUser(user.sub);
  }

  @Get('unread-count')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @Patch('read-all')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markRead(user.sub, id);
  }
}
