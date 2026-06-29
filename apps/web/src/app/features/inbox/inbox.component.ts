import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  ConversationsService,
  ConversationFilters,
} from '../../core/services/conversations.service';
import { SocketService } from '../../core/services/socket.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ConversationDetail,
  ConversationSummary,
  DepartmentDto,
  InboxMessage,
  QueueDto,
} from '@helix/types';
import { ConversationStatus } from '@helix/types';

const STATUS_FILTERS: { label: string; value: ConversationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: ConversationStatus.OPEN },
  { label: 'Waiting', value: ConversationStatus.WAITING },
  { label: 'Pending', value: ConversationStatus.PENDING },
  { label: 'Transferred', value: ConversationStatus.TRANSFERRED },
  { label: 'Resolved', value: ConversationStatus.RESOLVED },
];

@Component({
  selector: 'app-inbox',
  imports: [FormsModule, DatePipe],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit, OnDestroy {
  private readonly conversationsService = inject(ConversationsService);
  private readonly socketService = inject(SocketService);
  private readonly orgService = inject(OrganizationService);
  private readonly authService = inject(AuthService);

  @ViewChild('threadBody') threadBody?: ElementRef<HTMLDivElement>;

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly conversations = signal<ConversationSummary[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly detail = signal<ConversationDetail | null>(null);
  protected readonly messages = signal<InboxMessage[]>([]);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly queues = signal<QueueDto[]>([]);

  protected readonly loadingList = signal(true);
  protected readonly loadingThread = signal(false);
  protected readonly sending = signal(false);
  protected readonly customerTyping = signal(false);
  protected readonly typingLabel = signal('Customer is typing...');

  protected readonly search = signal('');
  protected readonly statusFilter = signal<ConversationStatus | ''>('');
  protected readonly mineOnly = signal(false);
  protected readonly draft = signal('');
  protected readonly noteDraft = signal('');

  protected readonly showTransfer = signal(false);
  protected readonly transferDeptId = signal('');
  protected readonly transferQueueId = signal('');
  protected readonly transferReason = signal('');

  protected readonly selectedConversation = computed(() => {
    const id = this.selectedId();
    return this.conversations().find((c) => c.id === id) ?? null;
  });

  private subs: Subscription[] = [];
  private previousConversationId: string | null = null;
  private typingTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadConversations();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.previousConversationId) {
      this.socketService.unsubscribeConversation(this.previousConversationId);
    }
  }

  protected loadConversations(): void {
    this.loadingList.set(true);
    const filters: ConversationFilters = {
      pageSize: 50,
      search: this.search() || undefined,
      status: this.statusFilter() || undefined,
      assignedAgentId: this.mineOnly() ? this.authService.user()?.id : undefined,
    };
    this.conversationsService.list(filters).subscribe({
      next: (res) => {
        this.conversations.set(res.items);
        this.loadingList.set(false);
        if (res.items.length && !this.selectedId()) {
          this.selectConversation(res.items[0].id);
        }
      },
      error: () => this.loadingList.set(false),
    });
  }

  protected selectConversation(id: string): void {
    if (this.previousConversationId) {
      this.socketService.unsubscribeConversation(this.previousConversationId);
    }
    this.selectedId.set(id);
    this.previousConversationId = id;
    this.socketService.subscribeConversation(id);
    this.loadingThread.set(true);
    this.detail.set(null);
    this.messages.set([]);

    this.conversationsService.get(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loadingThread.set(false);
      },
      error: () => this.loadingThread.set(false),
    });

    this.conversationsService.getMessages(id).subscribe({
      next: (res) => {
        this.messages.set(res.items);
        this.scrollToBottom();
      },
    });
  }

  protected sendReply(): void {
    const id = this.selectedId();
    const text = this.draft().trim();
    if (!id || !text || this.sending()) return;

    this.sending.set(true);
    this.draft.set('');
    this.conversationsService.sendMessage(id, text).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
        this.sending.set(false);
        this.scrollToBottom();
        this.bumpConversationPreview(id, text);
      },
      error: () => this.sending.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const id = this.selectedId();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!id || !file || this.sending()) return;

    this.sending.set(true);
    this.conversationsService.sendMessage(id, file.name, file).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
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

  protected onDraftInput(): void {
    const id = this.selectedId();
    if (!id) return;
    this.socketService.emitTypingStart(id);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.socketService.emitTypingStop(id), 1200);
  }

  protected resolve(): void {
    const id = this.selectedId();
    if (!id) return;
    this.conversationsService.resolve(id).subscribe({
      next: (d) => this.applyDetailUpdate(d),
    });
  }

  protected closeConversation(): void {
    const id = this.selectedId();
    if (!id) return;
    this.conversationsService.close(id).subscribe({
      next: (d) => this.applyDetailUpdate(d),
    });
  }

  protected openTransfer(): void {
    const d = this.detail();
    this.transferDeptId.set(d?.departmentId ?? '');
    this.transferQueueId.set(d?.queueId ?? '');
    this.showTransfer.set(true);
    if (this.transferDeptId()) {
      this.loadQueues(this.transferDeptId());
    }
  }

  protected onTransferDeptChange(deptId: string): void {
    this.transferDeptId.set(deptId);
    this.transferQueueId.set('');
    if (deptId) this.loadQueues(deptId);
  }

  protected confirmTransfer(): void {
    const id = this.selectedId();
    const deptId = this.transferDeptId();
    if (!id || !deptId) return;
    this.conversationsService
      .transfer(id, deptId, this.transferQueueId() || undefined, this.transferReason() || undefined)
      .subscribe({
        next: (d) => {
          this.applyDetailUpdate(d);
          this.showTransfer.set(false);
        },
      });
  }

  protected addNote(): void {
    const id = this.selectedId();
    const content = this.noteDraft().trim();
    if (!id || !content) return;
    this.conversationsService.addNote(id, content).subscribe({
      next: (note) => {
        this.detail.update((d) => (d ? { ...d, internalNotes: [note, ...d.internalNotes] } : d));
        this.noteDraft.set('');
      },
    });
  }

  protected refreshSummary(): void {
    const id = this.selectedId();
    if (!id) return;
    this.conversationsService.regenerateSummary(id).subscribe({
      next: (summary) => {
        this.detail.update((d) => (d ? { ...d, aiSummary: summary } : d));
      },
    });
  }

  protected isInbound(msg: InboxMessage): boolean {
    return msg.direction === 'INBOUND';
  }

  protected senderLabel(msg: InboxMessage): string {
    if (msg.senderType === 'BOT') return 'HELIX Bot';
    if (msg.senderType === 'CUSTOMER') return 'Customer';
    return msg.agentName ?? 'Agent';
  }

  protected statusClass(status: string): string {
    return status.toLowerCase();
  }

  protected priorityClass(priority: string): string {
    return priority.toLowerCase();
  }

  protected formatSummary(text?: string): string {
    return text ?? 'No AI summary yet. Hand off from bot or click Regenerate.';
  }

  private loadDepartments(): void {
    this.orgService.getDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
    });
  }

  private loadQueues(departmentId: string): void {
    this.orgService.getQueues(departmentId).subscribe({
      next: (q) => this.queues.set(q),
    });
  }

  private setupSocketListeners(): void {
    this.subs.push(
      this.socketService.onMessageReceived().subscribe((payload) => {
        const msg = payload.message as InboxMessage;
        if (payload.conversationId === this.selectedId()) {
          this.messages.update((list) => {
            if (list.some((m) => m.id === msg.id)) return list;
            return [...list, msg];
          });
          this.scrollToBottom();
        }
        this.bumpConversationPreview(payload.conversationId, msg.content);
      }),
      this.socketService.onTypingStart().subscribe((e) => {
        if (e.conversationId === this.selectedId() && e.userId !== this.authService.user()?.id) {
          this.customerTyping.set(true);
          this.typingLabel.set(e.userId === 'bot' ? 'HELIX Bot is typing...' : 'Customer is typing...');
        }
      }),
      this.socketService.onTypingStop().subscribe((e) => {
        if (e.conversationId === this.selectedId()) {
          this.customerTyping.set(false);
        }
      }),
      this.socketService.onConversationUpdated().subscribe((p) => {
        if ('conversation' in p && p.conversation) {
          this.handleConversationEvent(p.conversation);
        } else if ('conversationId' in p && 'aiSummary' in p && p.conversationId === this.selectedId()) {
          this.detail.update((d) => (d ? { ...d, aiSummary: p.aiSummary } : d));
        }
      }),
      this.socketService.onConversationAssigned().subscribe((p) => this.handleConversationEvent(p.conversation)),
      this.socketService.onConversationTransferred().subscribe((p) => this.handleConversationEvent(p.conversation)),
      this.socketService.onConversationResolved().subscribe((p) => this.handleConversationEvent(p.conversation)),
      this.socketService.onConversationClosed().subscribe((p) => this.handleConversationEvent(p.conversation)),
    );
  }

  private handleConversationEvent(conversation: ConversationDetail): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === conversation.id ? { ...c, ...this.toSummary(conversation) } : c)),
    );
    if (conversation.id === this.selectedId()) {
      this.detail.set(conversation);
    }
  }

  private applyDetailUpdate(d: ConversationDetail): void {
    this.detail.set(d);
    this.conversations.update((list) =>
      list.map((c) => (c.id === d.id ? { ...c, ...this.toSummary(d) } : c)),
    );
  }

  private toSummary(d: ConversationDetail): Partial<ConversationSummary> {
    return {
      status: d.status,
      priority: d.priority,
      assignedAgentId: d.assignedAgentId,
      assignedAgentName: d.assignedAgentName,
      departmentName: d.departmentName,
      aiSummary: d.aiSummary,
      botHandled: d.botHandled,
      updatedAt: d.updatedAt,
    };
  }

  private bumpConversationPreview(conversationId: string, preview: string): void {
    this.conversations.update((list) => {
      const updated = list.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: preview, lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : c,
      );
      return [...updated].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.threadBody?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
