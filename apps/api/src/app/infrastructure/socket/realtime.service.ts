import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@helix/shared';
import { DashboardStats } from '@helix/types';
import { DashboardService } from '../../modules/dashboard/dashboard.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private statsInterval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly gateway: EventsGateway,
    private readonly dashboardService: DashboardService,
  ) {}

  onModuleInit(): void {
    this.statsInterval = setInterval(() => {
      void this.refreshDashboardStats();
    }, 30_000);
  }

  onModuleDestroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  async refreshDashboardStats(): Promise<void> {
    try {
      const stats = await this.dashboardService.getStats();
      this.emitDashboardStats(stats);
    } catch (error) {
      this.logger.warn('Failed to refresh dashboard stats', error);
    }
  }

  emitDashboardStats(stats: DashboardStats): void {
    this.gateway.server
      .to(SOCKET_ROOMS.dashboard)
      .emit(SOCKET_EVENTS.DASHBOARD_STATS_UPDATED, stats);
  }

  emitToConversation(conversationId: string, event: string, payload: unknown): void {
    this.gateway.server.to(SOCKET_ROOMS.conversation(conversationId)).emit(event, payload);
  }

  emitToAgent(agentId: string, event: string, payload: unknown): void {
    this.gateway.server.to(SOCKET_ROOMS.agent(agentId)).emit(event, payload);
  }

  emitToDepartment(departmentId: string, event: string, payload: unknown): void {
    this.gateway.server.to(SOCKET_ROOMS.department(departmentId)).emit(event, payload);
  }

  emitToSimulator(customerId: string, event: string, payload: unknown): void {
    this.gateway.server.to(SOCKET_ROOMS.simulator(customerId)).emit(event, payload);
  }

  async emitConversationEvent(
    conversationId: string,
    event: string,
    payload: unknown,
    departmentId?: string | null,
    assignedAgentId?: string | null,
  ): Promise<void> {
    this.emitToConversation(conversationId, event, payload);
    if (departmentId) {
      this.emitToDepartment(departmentId, event, payload);
    }
    if (assignedAgentId) {
      this.emitToAgent(assignedAgentId, event, payload);
    }
    await this.refreshDashboardStats();
  }
}
