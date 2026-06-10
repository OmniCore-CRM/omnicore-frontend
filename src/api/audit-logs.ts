import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { AuditLog } from "@/types/models";

export interface AuditLogListParams {
  action?: string;
  entityType?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export async function listAuditLogs(
  token: string,
  params: AuditLogListParams = {},
): Promise<Paginated<AuditLog>> {
  const q = new URLSearchParams();
  if (params.action) q.set("action", params.action);
  if (params.entityType) q.set("entityType", params.entityType);
  if (params.actorId) q.set("actorId", params.actorId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/audit-logs${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
  return normalizePaginated<AuditLog>(raw);
}
