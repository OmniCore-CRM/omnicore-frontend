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

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Future ticketing module.
export interface Ticket {
  id: string;
  companyId?: string;

  subject: string;
  status: string;
  priority: TicketPriority;

  assignee?: AuthUser | null;
  conversationId?: string | null;

  slaDueAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
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
