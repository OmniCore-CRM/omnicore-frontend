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

// Authenticated platform user.
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
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
  tags?: string[];

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
  unreadCount?: number;

  assigneeId?: string | null;
  assignee?: AuthUser | null;

  updatedAt?: string;
  createdAt?: string;
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

  attachments?: {
    id: string;
    name: string;
    url?: string;
    mimeType?: string;
  }[];

  createdAt: string;
  updatedAt?: string;
}

export interface WidgetInstallation {
  id: string;
  publicKey: string;
  enabled: boolean;
  allowedDomains: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
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

  assigneeId?: string | null;
  assignee?: AuthUser | null;
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

  slaDueAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
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
  | "MESSAGE_RECEIVED_ON_WIDGET";

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
  actorId: string;
  actor?: AuthUser | null;
  action: TicketActivityAction;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// Notification center item.
export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

// Analytics dashboard payload.
export interface AnalyticsOverview {
  messageVolume24h?: number;
  messageVolume7d?: number;
  avgFirstResponseMinutes?: number;
  activeConversations?: number;
  newCustomers7d?: number;

  series?: {
    t: string;
    value: number;
  }[];
}
