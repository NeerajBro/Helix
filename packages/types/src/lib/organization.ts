import { AgentAvailabilityStatus } from './enums';

export interface DepartmentDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  queueCount?: number;
  agentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  departmentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QueueDto {
  id: string;
  name: string;
  slug: string;
  departmentId: string;
  departmentName?: string;
  skillId?: string;
  skillName?: string;
  routingStrategy: string;
  priority: number;
  slaFirstResponse?: number;
  slaResolution?: number;
  isActive: boolean;
  waitingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHourDto {
  id: string;
  departmentId?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  timezone: string;
  isActive: boolean;
}

export interface AgentAvailabilityDto {
  id: string;
  userId: string;
  userName: string;
  status: AgentAvailabilityStatus;
  reason?: string;
  since: string;
  departmentId?: string;
  departmentName?: string;
  activeConversations?: number;
  maxCapacity?: number;
}

export interface PriorityScoreBreakdown {
  total: number;
  factors: { name: string; score: number }[];
  recommendedPriority: string;
}

export interface PriorityInput {
  isVip?: boolean;
  isComplaint?: boolean;
  isUrgentTravel?: boolean;
  sentimentScore?: number;
  waitingMinutes?: number;
  whatsappExpiresAt?: string;
  slaBreached?: boolean;
}
