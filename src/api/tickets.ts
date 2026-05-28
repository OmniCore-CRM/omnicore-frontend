import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { Ticket } from "@/types/models";

export interface TicketListParams {
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export async function listTickets(
  token: string,
  params: TicketListParams = {},
): Promise<Paginated<Ticket>> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.assigneeId) q.set("assigneeId", params.assigneeId);
  if (params.search) q.set("search", params.search);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/tickets${qs ? `?${qs}` : ""}`, {
    token,
  });
  return normalizePaginated<Ticket>(raw);
}

export async function getTicket(token: string, id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`, { token });
}
