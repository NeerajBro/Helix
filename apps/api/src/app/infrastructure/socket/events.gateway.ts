import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@helix/shared';
import { JwtPayload } from '@helix/types';
import { PrismaService } from '../prisma/prisma.service';
import { SocketAuthService } from './socket-auth.service';
import { DashboardService } from '../../modules/dashboard/dashboard.service';

interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtPayload;
    departmentId?: string;
  };
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuth: SocketAuthService,
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const user = this.socketAuth.authenticate(client);
      const dbUser = await this.prisma.user.findFirst({
        where: { id: user.sub, deletedAt: null },
        select: { departmentId: true },
      });

      client.data.user = user;
      client.data.departmentId = dbUser?.departmentId ?? undefined;

      await client.join(SOCKET_ROOMS.agent(user.sub));
      if (dbUser?.departmentId) {
        await client.join(SOCKET_ROOMS.department(dbUser.departmentId));
      }
      if (user.permissions.includes('reports:read')) {
        await client.join(SOCKET_ROOMS.dashboard);
        const stats = await this.dashboardService.getStats();
        client.emit(SOCKET_EVENTS.DASHBOARD_STATS_UPDATED, stats);
      }

      this.logger.log(`Socket connected: ${user.email}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const email = client.data.user?.email;
    if (email) {
      this.logger.log(`Socket disconnected: ${email}`);
    }
  }

  @SubscribeMessage('subscribe:conversation')
  async handleSubscribeConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<{ subscribed: boolean }> {
    await client.join(SOCKET_ROOMS.conversation(payload.conversationId));
    return { subscribed: true };
  }

  @SubscribeMessage('unsubscribe:conversation')
  async handleUnsubscribeConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<{ subscribed: boolean }> {
    await client.leave(SOCKET_ROOMS.conversation(payload.conversationId));
    return { subscribed: false };
  }

  @SubscribeMessage('subscribe:simulator')
  async handleSubscribeSimulator(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { customerId: string },
  ): Promise<{ subscribed: boolean }> {
    await client.join(SOCKET_ROOMS.simulator(payload.customerId));
    return { subscribed: true };
  }

  @SubscribeMessage('unsubscribe:simulator')
  async handleUnsubscribeSimulator(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { customerId: string },
  ): Promise<{ subscribed: boolean }> {
    await client.leave(SOCKET_ROOMS.simulator(payload.customerId));
    return { subscribed: false };
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ): void {
    if (!payload?.conversationId) return;
    client.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
      SOCKET_EVENTS.TYPING_START,
      {
        conversationId: payload.conversationId,
        userId: client.data.user.sub,
        userName: client.data.user.email,
      },
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ): void {
    if (!payload?.conversationId) return;
    client.to(SOCKET_ROOMS.conversation(payload.conversationId)).emit(
      SOCKET_EVENTS.TYPING_STOP,
      {
        conversationId: payload.conversationId,
        userId: client.data.user.sub,
      },
    );
  }
}
