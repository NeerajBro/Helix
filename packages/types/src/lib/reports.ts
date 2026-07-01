export interface ReportDateRange {
  from: string;
  to: string;
}

export interface ReportsSummary {
  totalConversations: number;
  resolved: number;
  closed: number;
  avgFirstResponseMinutes: number;
  avgResolutionMinutes: number;
  slaComplianceRate: number;
  slaBreached: number;
  csatAverage: number;
  csatResponses: number;
  botHandoffRate: number;
  messagesTotal: number;
}

export interface DepartmentReportRow {
  departmentId: string;
  departmentName: string;
  total: number;
  resolved: number;
  open: number;
  avgFirstResponseMinutes: number;
  slaBreached: number;
  csatAverage?: number;
}

export interface AgentReportRow {
  agentId: string;
  agentName: string;
  departmentName?: string;
  assigned: number;
  resolved: number;
  avgFirstResponseMinutes: number;
  avgResolutionMinutes: number;
  csatAverage?: number;
}

export interface ConversationReportRow {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: string;
  departmentName?: string;
  agentName?: string;
  botHandled: boolean;
  slaBreached: boolean;
  firstResponseMinutes?: number;
  resolutionMinutes?: number;
  csatRating?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface BotReport {
  totalConversations: number;
  botHandled: number;
  handoffCount: number;
  handoffRate: number;
  avgMessagesBeforeHandoff: number;
  intentBreakdown: { intent: string; count: number }[];
}

export interface SlaReport {
  totalEvaluated: number;
  breached: number;
  complianceRate: number;
  avgFirstResponseMinutes: number;
  avgResolutionMinutes: number;
  firstResponseTargetMinutes: number;
  resolutionTargetMinutes: number;
  byDepartment: { departmentName: string; breached: number; total: number }[];
  recentBreaches: SlaBreachAlert[];
}

export interface SlaBreachAlert {
  conversationId: string;
  customerPhone: string;
  customerName?: string;
  departmentName?: string;
  breachType: 'FIRST_RESPONSE' | 'RESOLUTION';
  breachedAt: string;
  minutesOverdue: number;
}

export interface CsatSurveyDto {
  id: string;
  conversationId: string;
  customerId: string;
  agentId?: string;
  agentName?: string;
  customerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CsatReport {
  averageRating: number;
  totalResponses: number;
  distribution: { rating: number; count: number }[];
  byAgent: { agentId: string; agentName: string; average: number; count: number }[];
  recent: CsatSurveyDto[];
}

export interface ReportsBundle {
  range: ReportDateRange;
  summary: ReportsSummary;
  departments: DepartmentReportRow[];
  agents: AgentReportRow[];
  bot: BotReport;
  sla: SlaReport;
  csat: CsatReport;
}
