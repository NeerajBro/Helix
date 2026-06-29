export interface DashboardStats {
  openConversations: number;
  waitingConversations: number;
  pendingConversations: number;
  resolvedToday: number;
  closedToday: number;
  agentsOnline: number;
  totalAgents: number;
  departments: number;
  queues: number;
  messagesToday: number;
  timestamp: string;
}
