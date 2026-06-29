export interface SimulatorCustomerSummary {
  id: string;
  phone: string;
  name?: string;
  isVip: boolean;
  isOnline: boolean;
  lastContactedAt?: string;
  activeConversationId?: string;
  whatsappExpiresAt?: string;
  windowOpen: boolean;
  unreadCount: number;
}

export interface SimulatorConversationState {
  customer: SimulatorCustomerSummary;
  conversationId: string;
  status: string;
  subject?: string;
}
