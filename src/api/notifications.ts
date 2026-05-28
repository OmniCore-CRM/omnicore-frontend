import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { NotificationItem } from "@/types/models";

export async function listNotifications(
  token: string,
): Promise<Paginated<NotificationItem>> {
  const raw = await apiFetch<unknown>("/notifications", { token });
  return normalizePaginated<NotificationItem>(raw);
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<void>(`/notifications/${id}/read`, {
    method: "POST",
    token,
  });
}
