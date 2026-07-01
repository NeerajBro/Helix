import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SimulatorService, SimulatorMessage } from '../../core/services/simulator.service';
import { SocketService } from '../../core/services/socket.service';
import { SimulatorCustomerSummary } from '@helix/types';

@Component({
  selector: 'app-simulator',
  imports: [FormsModule, DatePipe],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.scss',
})
export class SimulatorComponent implements OnInit, OnDestroy {
  private readonly simulatorService = inject(SimulatorService);
  private readonly socketService = inject(SocketService);

  @ViewChild('chatBody') chatBody?: ElementRef<HTMLDivElement>;

  protected readonly customers = signal<SimulatorCustomerSummary[]>([]);
  protected readonly selectedCustomerId = signal<string | null>(null);
  protected readonly messages = signal<SimulatorMessage[]>([]);
  protected readonly customerState = signal<SimulatorCustomerSummary | null>(null);
  protected readonly draft = signal('');
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly agentTyping = signal(false);
  protected readonly typingLabel = signal('Agent is typing...');
  protected readonly search = signal('');

  protected readonly selectedCustomer = computed(() => {
    const id = this.selectedCustomerId();
    return this.customers().find((c) => c.id === id) ?? null;
  });

  protected readonly windowLabel = computed(() => {
    const expires = this.customerState()?.whatsappExpiresAt;
    if (!expires) return '24h window closed';
    const diff = new Date(expires).getTime() - Date.now();
    if (diff <= 0) return '24h window expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m remaining`;
  });

  private subs: Subscription[] = [];
  private typingTimeout?: ReturnType<typeof setTimeout>;
  private previousCustomerId: string | null = null;

  ngOnInit(): void {
    this.loadCustomers();
    this.subs.push(
      this.socketService.onSimulatorMessage().subscribe((payload) => {
        if (payload.customerId !== this.selectedCustomerId()) return;
        const msg = payload.message as SimulatorMessage;
        this.messages.update((list) => {
          if (list.some((m) => m.id === msg.id)) return list;
          return [...list, msg];
        });
        if (payload.direction === 'outbound') {
          void this.simulatorService.markRead(payload.customerId).subscribe();
        }
        if ('csatPending' in payload && payload.csatPending) {
          this.customerState.update((s) => (s ? { ...s, csatPending: true } : s));
        }
        if ('csatPending' in payload && payload.csatPending === false) {
          this.customerState.update((s) => (s ? { ...s, csatPending: false } : s));
        }
        this.scrollToBottom();
      }),
      this.socketService.onSimulatorStatus().subscribe((status) => {
        if (status['customerId'] !== this.selectedCustomerId()) return;
        this.customerState.update((s) =>
          s
            ? {
                ...s,
                isOnline: (status['isOnline'] as boolean | undefined) ?? s.isOnline,
                whatsappExpiresAt:
                  (status['whatsappExpiresAt'] as string | undefined) ?? s.whatsappExpiresAt,
                windowOpen: status['whatsappExpiresAt']
                  ? new Date(status['whatsappExpiresAt'] as string).getTime() > Date.now()
                  : s.windowOpen,
              }
            : s,
        );
      }),
      this.socketService.onTypingStart().subscribe((e) => {
        const convId = this.customerState()?.activeConversationId;
        if (convId && e.conversationId === convId) {
          this.agentTyping.set(true);
          this.typingLabel.set(e.userId === 'bot' ? 'HELIX Bot is typing...' : 'Agent is typing...');
        }
      }),
      this.socketService.onTypingStop().subscribe((e) => {
        const convId = this.customerState()?.activeConversationId;
        if (convId && e.conversationId === convId) {
          this.agentTyping.set(false);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.previousCustomerId) {
      this.socketService.unsubscribeSimulator(this.previousCustomerId);
    }
  }

  protected loadCustomers(): void {
    this.loading.set(true);
    this.simulatorService.listCustomers(this.search() || undefined).subscribe({
      next: (res) => {
        this.customers.set(res.data.items);
        if (res.data.items.length && !this.selectedCustomerId()) {
          this.selectCustomer(res.data.items[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectCustomer(customerId: string): void {
    if (this.previousCustomerId) {
      this.socketService.unsubscribeSimulator(this.previousCustomerId);
    }
    this.selectedCustomerId.set(customerId);
    this.previousCustomerId = customerId;
    this.socketService.subscribeSimulator(customerId);

    this.simulatorService.getCustomerState(customerId).subscribe({
      next: (res) => this.customerState.set(res.data.customer),
    });
    this.simulatorService.getMessages(customerId).subscribe({
      next: (res) => {
        this.messages.set(res.data);
        void this.simulatorService.markRead(customerId).subscribe();
        this.scrollToBottom();
      },
    });
  }

  protected toggleOnline(): void {
    const customer = this.customerState();
    if (!customer) return;
    const next = !customer.isOnline;
    this.simulatorService.setPresence(customer.id, next).subscribe({
      next: () => this.customerState.update((s) => (s ? { ...s, isOnline: next } : s)),
    });
  }

  protected submitCsat(rating: number): void {
    const customerId = this.selectedCustomerId();
    if (!customerId || this.sending()) return;
    this.sending.set(true);
    this.simulatorService.submitCsat(customerId, rating).subscribe({
      next: () => {
        this.customerState.update((s) => (s ? { ...s, csatPending: false } : s));
        this.sending.set(false);
        if (customerId) {
          this.simulatorService.getMessages(customerId).subscribe({
            next: (res) => {
              this.messages.set(res.data);
              this.scrollToBottom();
            },
          });
        }
      },
      error: () => this.sending.set(false),
    });
  }

  protected onDraftInput(): void {
    const convId = this.customerState()?.activeConversationId;
    if (!convId) return;
    this.socketService.emitTypingStart(convId);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socketService.emitTypingStop(convId);
    }, 1200);
  }

  protected send(): void {
    const customerId = this.selectedCustomerId();
    const text = this.draft().trim();
    if (!customerId || !text || this.sending()) return;

    this.sending.set(true);
    this.draft.set('');
    this.simulatorService.sendMessage(customerId, text).subscribe({
      next: (res) => {
        this.messages.update((list) => [...list, res.data]);
        this.sending.set(false);
        this.scrollToBottom();
      },
      error: () => this.sending.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const customerId = this.selectedCustomerId();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!customerId || !file || this.sending()) return;

    this.sending.set(true);
    this.simulatorService.sendMessage(customerId, file.name, file).subscribe({
      next: (res) => {
        this.messages.update((list) => [...list, res.data]);
        this.sending.set(false);
        this.scrollToBottom();
        input.value = '';
      },
      error: () => {
        this.sending.set(false);
        input.value = '';
      },
    });
  }

  protected statusIcon(msg: SimulatorMessage): string {
    if (msg.direction === 'INBOUND') return '';
    if (msg.readAt) return 'done_all';
    if (msg.deliveredAt) return 'done_all';
    if (msg.sentAt) return 'done';
    return 'schedule';
  }

  protected isOutbound(msg: SimulatorMessage): boolean {
    return msg.direction === 'OUTBOUND';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatBody?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
