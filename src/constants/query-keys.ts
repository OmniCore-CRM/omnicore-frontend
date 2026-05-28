export const queryKeys = {
  me: ["me"] as const,
  conversations: (params: Record<string, string | undefined>) =>
    ["conversations", params] as const,
  conversation: (id: string) => ["conversation", id] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  customers: (params: Record<string, string | undefined>) =>
    ["customers", params] as const,
  customer: (id: string) => ["customer", id] as const,
  tickets: (params: Record<string, string | undefined>) =>
    ["tickets", params] as const,
  ticket: (id: string) => ["ticket", id] as const,
  analyticsOverview: ["analytics", "overview"] as const,
  teamMembers: (companyId: string) => ["team", companyId] as const,
};
