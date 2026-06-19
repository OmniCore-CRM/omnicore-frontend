import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type {
  Ticket,
  TicketActivity,
  TicketNote,
  TicketPriority,
  TicketStatus,
} from "@/types/models";

export interface TicketListParams {
  status?: string;
  priority?: string;
  assigneeId?: string;
  teamId?: string;
  tagId?: string;
  slaStatus?: string;
  createdDate?: string;
  updatedDate?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface TicketListSummary {
  total: number;
  openPending: number;
  escalated: number;
  resolvedClosed: number;
}

export type TicketListResponse = Paginated<Ticket> & {
  summary?: TicketListSummary;
};

export async function listTickets(
  token: string,
  params: TicketListParams = {},
): Promise<TicketListResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.assigneeId) q.set("assigneeId", params.assigneeId);
  if (params.teamId) q.set("teamId", params.teamId);
  if (params.tagId) q.set("tagId", params.tagId);
  if (params.slaStatus) q.set("slaStatus", params.slaStatus);
  if (params.createdDate) q.set("createdDate", params.createdDate);
  if (params.updatedDate) q.set("updatedDate", params.updatedDate);
  if (params.search) q.set("search", params.search);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/tickets${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
  const normalized = normalizePaginated<Ticket>(raw) as TicketListResponse;

  if (raw && typeof raw === "object" && "summary" in raw) {
    normalized.summary = (raw as { summary?: TicketListSummary }).summary;
  }

  return normalized;
}

export async function getTicket(token: string, id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`, { token, cache: "no-store" });
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  customerId?: string | null;
  conversationId?: string | null;
  assigneeId?: string | null;
}

export async function createTicket(
  token: string,
  body: CreateTicketInput,
): Promise<Ticket> {
  return apiFetch<Ticket>("/tickets", {
    method: "POST",
    token,
    body,
  });
}

export async function createTicketFromConversation(
  token: string,
  conversationId: string,
  body: {
    subject: string;
    description?: string;
    priority?: TicketPriority;
    assigneeId?: string | null;
  },
): Promise<Ticket> {
  return apiFetch<Ticket>(`/conversations/${conversationId}/tickets`, {
    method: "POST",
    token,
    body,
  });
}

export async function updateTicket(
  token: string,
  id: string,
  body: Partial<
    Pick<Ticket, "subject" | "description" | "status" | "priority" | "assigneeId">
  >,
): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function listTicketNotes(
  token: string,
  ticketId: string,
): Promise<TicketNote[]> {
  return apiFetch<TicketNote[]>(`/tickets/${ticketId}/notes`, {
    token,
    cache: "no-store",
  });
}

export async function createTicketNote(
  token: string,
  ticketId: string,
  body: {
    content: string;
  },
): Promise<TicketNote> {
  return apiFetch<TicketNote>(`/tickets/${ticketId}/notes`, {
    method: "POST",
    token,
    body,
  });
}

export async function listTicketActivity(
  token: string,
  ticketId: string,
): Promise<TicketActivity[]> {
  return apiFetch<TicketActivity[]>(`/tickets/${ticketId}/activity`, {
    token,
    cache: "no-store",
  });
}
