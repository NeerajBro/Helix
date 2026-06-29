export const SOCKET_ROOMS = {
  dashboard: 'dashboard',
  agent: (userId: string) => `agent:${userId}`,
  department: (departmentId: string) => `department:${departmentId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  simulator: (customerId: string) => `simulator:${customerId}`,
} as const;
