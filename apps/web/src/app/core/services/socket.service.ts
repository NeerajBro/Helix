import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@helix/shared';
import { DashboardStats, MessageDto, ConversationDetail, NotificationDto } from '@helix/types';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName?: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly dashboardStats = signal<DashboardStats | null>(null);

  connect(): void {
    const token = this.auth.getAccessToken();
    if (!token) return;
    if (this.socket?.connected) return;

    this.socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on(SOCKET_EVENTS.DASHBOARD_STATS_UPDATED, (stats: DashboardStats) => {
      this.dashboardStats.set(stats);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.dashboardStats.set(null);
  }

  subscribeConversation(conversationId: string): void {
    this.socket?.emit('subscribe:conversation', { conversationId });
  }

  unsubscribeConversation(conversationId: string): void {
    this.socket?.emit('unsubscribe:conversation', { conversationId });
  }

  subscribeSimulator(customerId: string): void {
    this.socket?.emit('subscribe:simulator', { customerId });
  }

  unsubscribeSimulator(customerId: string): void {
    this.socket?.emit('unsubscribe:simulator', { customerId });
  }

  onSimulatorMessage(): Observable<{
    conversationId: string;
    customerId: string;
    message: unknown;
    direction: 'inbound' | 'outbound';
  }> {
    return this.listen(SOCKET_EVENTS.SIMULATOR_MESSAGE);
  }

  onSimulatorStatus(): Observable<Record<string, unknown>> {
    return this.listen(SOCKET_EVENTS.SIMULATOR_STATUS);
  }

  onMessageReceived(): Observable<{ conversationId: string; message: MessageDto }> {
    return this.listen(SOCKET_EVENTS.MESSAGE_RECEIVED);
  }

  onConversationUpdated(): Observable<
    { conversation: ConversationDetail } | { conversationId: string; aiSummary: string }
  > {
    return this.listen(SOCKET_EVENTS.CONVERSATION_UPDATED);
  }

  onConversationAssigned(): Observable<{ conversationId: string; conversation: ConversationDetail }> {
    return this.listen(SOCKET_EVENTS.CONVERSATION_ASSIGNED);
  }

  onConversationTransferred(): Observable<{ conversationId: string; conversation: ConversationDetail }> {
    return this.listen(SOCKET_EVENTS.CONVERSATION_TRANSFERRED);
  }

  onConversationResolved(): Observable<{ conversationId: string; conversation: ConversationDetail }> {
    return this.listen(SOCKET_EVENTS.CONVERSATION_RESOLVED);
  }

  onConversationClosed(): Observable<{ conversationId: string; conversation: ConversationDetail }> {
    return this.listen(SOCKET_EVENTS.CONVERSATION_CLOSED);
  }

  onTypingStart(): Observable<TypingEvent> {
    return this.listen(SOCKET_EVENTS.TYPING_START);
  }

  onTypingStop(): Observable<TypingEvent> {
    return this.listen(SOCKET_EVENTS.TYPING_STOP);
  }

  onAgentStatusChanged(): Observable<TypingEvent & { status: string }> {
    return this.listen(SOCKET_EVENTS.AGENT_STATUS_CHANGED);
  }

  onSlaBreach(): Observable<{
    conversationId: string;
    customerPhone: string;
    breachType: string;
    minutesOverdue: number;
  }> {
    return this.listen(SOCKET_EVENTS.SLA_BREACH);
  }

  onConversationCreated(): Observable<{ conversation: ConversationDetail }> {
    return this.listen(SOCKET_EVENTS.CONVERSATION_CREATED);
  }

  onNotificationNew(): Observable<NotificationDto> {
    return this.listen(SOCKET_EVENTS.NOTIFICATION_NEW);
  }

  emitTypingStart(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }

  emitTypingStop(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private listen<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (payload: T) => subscriber.next(payload);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }
}
