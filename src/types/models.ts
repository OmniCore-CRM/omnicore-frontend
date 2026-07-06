/**
 * Shared frontend domain models.
 *
 * These models should stay closely aligned with backend DTOs and Prisma enums.
 * Avoid frontend-only naming drift for core entities.
 */

// Supported communication channels.
export type ConversationChannel =
  | "WEBSITE"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "EMAIL";

// Tenant/company entity.
export interface Company {
  id: string;
  name: string;
}

// Backend-aligned RBAC roles.
export type UserRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "ADMIN"
  | "TEAM_LEAD"
  | "AGENT"
  | "VIEWER";

export type UserLifecycleStatus =
  | "INVITED"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export type InvitationState =
  | "NONE"
  | "PENDING"
  | "REVOKED"
  | "EXPIRED"
  | "ACCEPTED";

// Authenticated platform user.
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserLifecycleStatus;
  invitationState?: InvitationState;
  invitationSentAt?: string | null;
  invitationExpiresAt?: string | null;
  companyId: string;

  // Optional UI-only fields.
  displayName?: string | null;
  avatarUrl?: string | null;
}

// Customer profile inside a company.
export interface Customer {
  id: string;
  companyId: string;

  firstName: string;
  lastName?: string | null;

  email?: string | null;
  phone?: string | null;

  avatarUrl?: string | null;
  tags?: Tag[];

  // Future-ready identity resolution structure.
  identities?: {
    channel: ConversationChannel;
    externalId: string;
    label?: string;
  }[];

  createdAt?: string;
  updatedAt?: string;

  channelsUsed?: ConversationChannel[];
  lastActivityAt?: string | null;
  metrics?: CustomerMetrics;
  conversations?: CustomerConversationSummary[];
  tickets?: CustomerTicketSummary[];
  timeline?: CustomerTimelineItem[];
}

export interface CustomerMetrics {
  totalConversations: number;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  lastInteractionAt?: string | null;
}

export interface CustomerConversationSummary {
  id: string;
  customerId: string;
  channel: ConversationChannel;
  status?: ConversationStatus | string;
  lastMessage?: Message | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tags?: Tag[];
}

export interface CustomerTicketSummary {
  id: string;
  subject: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string | null;
  assignee?: AuthUser | null;
  conversationId?: string | null;
  customerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tags?: Tag[];
}

export type CustomerTimelineItemType =
  | "CONVERSATION_CREATED"
  | "CUSTOMER_MESSAGE"
  | "AGENT_REPLY"
  | "TICKET_CREATED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_NOTE_ADDED"
  | "TICKET_RESOLVED";

export interface CustomerTimelineItem {
  id: string;
  type: CustomerTimelineItemType;
  title: string;
  description?: string | null;
  timestamp: string;
  channel?: ConversationChannel | string | null;
  conversationId?: string | null;
  ticketId?: string | null;
  actor?: AuthUser | null;
}

// Inbox conversation states.
export type ConversationStatus =
  | "OPEN"
  | "PENDING"
  | "RESOLVED"
  | "SNOOZED";

// Unified omnichannel conversation.
export interface Conversation {
  id: string;
  companyId: string;

  customerId: string;
  customer?: Customer;

  channel: ConversationChannel;
  status?: ConversationStatus;

  // Future inbox enhancements.
  subject?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastMessage?: Message | null;
  latestMessage?: Message | null;
  latestCustomerMessage?: Message | null;
  latestAgentReply?: Message | null;
  recentMessages?: Message[];
  messages?: Message[];
  activities?: ConversationActivity[];
  attachments?: Attachment[];
  tags?: Tag[];
  unreadCount?: number;
  tickets?: CustomerTicketSummary[];
  primaryTicket?: CustomerTicketSummary | null;

  assigneeId?: string | null;
  assignee?: AuthUser | null;
  teamId?: string | null;
  team?: Team | null;

  updatedAt?: string;
  createdAt?: string;
}

export interface ConversationActivity {
  id: string;
  conversationId: string;
  actorId: string | null;
  actor?: AuthUser | null;
  action:
    | "STATUS_CHANGED"
    | "TEAM_ASSIGNED"
    | "TEAM_UNASSIGNED"
    | "AUTO_TEAM_ASSIGNED";
  metadata?: {
    from?: ConversationStatus;
    to?: ConversationStatus;
  } | null;
  createdAt: string;
}

// Backend-aligned sender types.
export type MessageSender = "CUSTOMER" | "AGENT" | "SYSTEM";

// Backend-aligned delivery lifecycle.
export type MessageStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

// Conversation message entity.
export interface Message {
  id: string;

  companyId?: string;
  conversationId: string;

  content: string;

  sender: MessageSender;
  status?: MessageStatus;

  senderId?: string | null;
  senderUser?: AuthUser | null;

  provider?: ConversationChannel | null;
  externalMessageId?: string | null;
  metadata?: {
    subject?: string;
    from?: string;
    to?: string[];
  } | null;

  attachments?: Attachment[];

  createdAt: string;
  updatedAt?: string;
}

export type EmailAccountStatus = "ACTIVE" | "DISABLED";

export interface EmailAccount {
  id: string;
  companyId: string;
  provider: "RESEND";
  fromEmail: string;
  fromName?: string | null;
  status: EmailAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  companyId?: string;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    displayName?: string | null;
  } | null;
  customerId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  ticketId?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedFrom: "AGENT" | "CUSTOMER_WIDGET";
  downloadUrl: string;
  createdAt: string;
}

export interface WidgetInstallation {
  id: string;
  publicKey: string;
  enabled: boolean;
  allowedDomains: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedReply {
  id: string;
  companyId: string;
  title: string;
  content: string;
  createdById: string;
  createdBy?: AuthUser | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  actorId?: string | null;
  actor?: AuthUser | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SlaStatus = "ON_TRACK" | "AT_RISK" | "BREACHED" | "PAUSED";
export type TicketStatus =
  | "OPEN"
  | "PENDING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export interface Ticket {
  id: string;
  companyId?: string;

  subject: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  firstResponseDueAt?: string | null;
  resolutionDueAt?: string | null;
  firstRespondedAt?: string | null;
  resolvedAt?: string | null;
  slaStatus: SlaStatus;

  assigneeId?: string | null;
  assignee?: AuthUser | null;
  teamId?: string | null;
  team?: Team | null;
  createdById?: string;
  createdBy?: AuthUser | null;
  customerId?: string | null;
  customer?: Customer | null;
  conversationId?: string | null;
  conversation?: Pick<
    Conversation,
    | "id"
    | "customerId"
    | "channel"
    | "latestCustomerMessage"
    | "latestAgentReply"
    | "recentMessages"
    | "createdAt"
    | "updatedAt"
  > | null;
  notes?: TicketNote[];
  activities?: TicketActivity[];
  metrics?: TicketMetrics;
  tags?: Tag[];
  attachments?: Attachment[];

  slaDueAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  members: AuthUser[];
  ticketCount: number;
  conversationCount: number;
  openTicketCount: number;
  openConversationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentRuleTargetType = "CONVERSATION" | "TICKET";
export type AssignmentRuleConditionType = "CHANNEL" | "PRIORITY" | "TAG";

export interface AssignmentRule {
  id: string;
  name: string;
  enabled: boolean;
  targetType: AssignmentRuleTargetType;
  conditionType: AssignmentRuleConditionType;
  conditionValue: string;
  teamId: string;
  team: Pick<Team, "id" | "name" | "description">;
  createdAt: string;
  updatedAt: string;
}

export type TicketActivityAction =
  | "TICKET_CREATED"
  | "TICKET_CREATED_FROM_WIDGET"
  | "TICKET_UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "NOTE_ADDED"
  | "MESSAGE_RECEIVED_ON_WIDGET"
  | "TEAM_ASSIGNED"
  | "TEAM_UNASSIGNED"
  | "AUTO_TEAM_ASSIGNED"
  | "SLA_UPDATED"
  | "SLA_BREACHED";

export interface TicketMetrics {
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string | null;
  firstResponseTimeMinutes?: number | null;
  resolvedAt?: string | null;
  timeOpenMinutes?: number | null;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  authorId: string;
  author?: AuthUser | null;
  content: string;
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  actorId: string | null;
  actor?: AuthUser | null;
  action: TicketActivityAction;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// Notification center item.
export interface NotificationItem {
  id: string;
  type:
    | "TICKET_ASSIGNED"
    | "CONVERSATION_ASSIGNED"
    | "TICKET_TEAM_ASSIGNED"
    | "CONVERSATION_TEAM_ASSIGNED"
    | "TICKET_MENTION"
    | "CONVERSATION_MENTION"
    | "INVITE_ACCEPTED"
    | "USER_ACTIVATED"
    | "TEAM_MEMBER_ADDED"
    | "ROLE_CHANGED";
  title: string;
  message: string;
  body?: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  read: boolean;
  createdAt: string;
}

export interface AssignmentCenterCounterSet {
  myAssignedOpenTickets: number;
  myAssignedConversations: number;
  unreadAssignedWork: number;
  pendingAssignedWork: number;
  slaAtRisk: number;
  slaBreached: number;
  escalations: number;
  recentlyAssigned: number;
}

export interface AssignmentCenterTicketItem {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  slaStatus: SlaStatus;
  updatedAt: string;
  openRoute: string;
  team?: {
    id: string;
    name: string;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface AssignmentCenterConversationItem {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  updatedAt: string;
  openRoute: string;
  team?: {
    id: string;
    name: string;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  latestMessage?: {
    id: string;
    content: string;
    sender: MessageSender;
    createdAt: string;
  } | null;
}

export interface AssignmentCenterRecentAssignmentItem {
  id: string;
  type: NotificationItem["type"];
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
  openRoute: string | null;
}

export interface AssignmentCenterTeamWorkloadItem {
  user: {
    id: string;
    role: UserRole;
    displayName: string;
    email: string;
    teams: Array<{
      id: string;
      name: string;
    }>;
  };
  counts: {
    assignedOpenTickets: number;
    assignedConversations: number;
    pendingAssignedWork: number;
    unreadAssignedWork: number;
    escalations: number;
    slaAtRisk: number;
    slaBreached: number;
  };
}

export interface AssignmentCenterOverview {
  scope: {
    canViewTeamWorkload: boolean;
  };
  counters: AssignmentCenterCounterSet;
  myTickets: AssignmentCenterTicketItem[];
  myConversations: AssignmentCenterConversationItem[];
  recentAssignments: AssignmentCenterRecentAssignmentItem[];
  teamWorkload: AssignmentCenterTeamWorkloadItem[] | null;
}

export type AnalyticsPresetRange = "7d" | "30d" | "90d";
export type AnalyticsRange = AnalyticsPresetRange | "all" | "custom";

export interface AnalyticsBreakdownItem {
  key: string;
  count: number;
}

export interface AnalyticsTeamItem {
  teamId: string | null;
  name: string;
  count: number;
}

export interface AnalyticsRecentActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: {
    id: string;
    displayName: string;
  } | null;
  createdAt: string;
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  period: {
    from: string | null;
    to: string;
  };
  summary: {
    totalCustomers: number;
    totalConversations: number;
    openConversations: number;
    pendingConversations: number;
    resolvedConversations: number;
    totalTickets: number;
    openTickets: number;
    resolvedClosedTickets: number;
    attachmentsCount: number;
    teamCount: number;
  };
  conversationsByChannel: AnalyticsBreakdownItem[];
  conversationsByStatus: AnalyticsBreakdownItem[];
  ticketsByStatus: AnalyticsBreakdownItem[];
  ticketsByPriority: AnalyticsBreakdownItem[];
  ticketsByTeam: AnalyticsTeamItem[];
  conversationsByTeam: AnalyticsTeamItem[];
  recentActivity: AnalyticsRecentActivity[];
}
