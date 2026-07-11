export const queryKeys = {
  me: ["me"] as const,
  users: ["users"] as const,
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
  savedReplies: (params?: Record<string, string | undefined>) =>
    ["saved-replies", params ?? {}] as const,
  tags: (params?: Record<string, string | undefined>) =>
    ["tags", params ?? {}] as const,
  analyticsOverview: (params: Record<string, string>) =>
    ["analytics", "overview", params] as const,
  teams: ["teams"] as const,
  auditLogs: (params?: Record<string, string | undefined>) =>
    ["audit-logs", params ?? {}] as const,
  slaPolicies: ["sla-policies"] as const,
  assignmentRules: ["assignment-rules"] as const,
  emailAccounts: ["email-accounts"] as const,
  widgetInstallations: ["widget-installations"] as const,
  widgetFaqEntries: (installationId: string) =>
    ["widget-faq-entries", installationId] as const,
  widgetArticleCategories: (installationId: string) =>
    ["widget-article-categories", installationId] as const,
  widgetArticles: (installationId: string) =>
    ["widget-articles", installationId] as const,
  notifications: (params?: Record<string, string | undefined>) =>
    ["notifications", params ?? {}] as const,
  notificationUnreadCount: ["notification-unread-count"] as const,
  assignmentCenter: (params?: Record<string, string | undefined>) =>
    ["assignment-center", params ?? {}] as const,
  companyPortalSettings: ["company-portal-settings"] as const,
};
