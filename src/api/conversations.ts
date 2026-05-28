import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { Conversation, Message } from "@/types/models";

export interface ConversationListParams {
  search?: string;
  status?: string;
  assigneeId?: string;
  cursor?: string;
  limit?: number;
}

export async function listConversations(
  token: string,
  params: ConversationListParams = {},
): Promise<Paginated<Conversation>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.assigneeId) q.set("assigneeId", params.assigneeId);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(
    `/conversations${qs ? `?${qs}` : ""}`,
    { token },
  );
  return normalizePaginated<Conversation>(raw);
}

export async function getConversation(
  token: string,
  id: string,
): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversations/${id}`, { token });
}

export async function patchConversation(
  token: string,
  id: string,
  // Conversation assignment/status APIs are planned for future CRM workflow modules.
  body: Partial<Pick<Conversation, "assigneeId">>,
): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversations/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export interface MessageListParams {
  cursor?: string;
  limit?: number;
}

export async function listMessages(
  token: string,
  conversationId: string,
  params: MessageListParams = {},
): Promise<Paginated<Message>> {
  const q = new URLSearchParams();
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(
    `/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
    { token },
  );
  return normalizePaginated<Message>(raw);
}

// Send outbound message into a conversation thread.
// Backend handles provider routing (WhatsApp, future channels, etc).
export async function sendMessage(
  token: string,
  conversationId: string,
  body: {
    content: string;
    attachments?: unknown[];
  },
): Promise<Message> {
  return apiFetch<Message>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    token,
    body,
  });
}

export async function markConversationRead(
  token: string,
  conversationId: string,
): Promise<void> {
  await apiFetch<void>(`/conversations/${conversationId}/read`, {
    method: "POST",
    token,
  });
}
