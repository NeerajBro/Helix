export interface DashboardStats {
  openConversations: number;
  waitingConversations: number;
  pendingConversations: number;
  resolvedToday: number;
  closedToday: number;
  slaBreached: number;
  avgFirstResponseMinutes: number;
  agentsOnline: number;
  totalAgents: number;
  departments: number;
  queues: number;
  messagesToday: number;
  timestamp: string;
}

export interface DashboardTrendPoint {
  date: string;
  opened: number;
  resolved: number;
  messages: number;
}

export interface DepartmentDistribution {
  departmentId: string;
  departmentName: string;
  count: number;
  color: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  departmentName?: string;
  status: string;
  activeConversations: number;
  maxCapacity: number;
  utilization: number;
  resolvedToday: number;
}

export interface DashboardAnalytics {
  trends: DashboardTrendPoint[];
  departmentDistribution: DepartmentDistribution[];
  agentPerformance: AgentPerformance[];
}
