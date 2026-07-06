import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { NotificationItem } from "@/types/models";

export async function listNotifications(
  token: string,
  params: {
    cursor?: string;
    limit?: number;
  } = {},
): Promise<Paginated<NotificationItem>> {
  const q = new URLSearchParams();
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/notifications${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
  return normalizePaginated<NotificationItem>(raw);
}

export async function getUnreadNotificationCount(token: string): Promise<{
  unread: number;
}> {
  return apiFetch<{ unread: number }>("/notifications/unread-count", {
    token,
    cache: "no-store",
  });
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export async function markNotificationUnread(
  token: string,
  id: string,
): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/unread`, {
    method: "PATCH",
    token,
  });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch<void>("/notifications/read-all", {
    method: "PATCH",
    token,
  });
}
