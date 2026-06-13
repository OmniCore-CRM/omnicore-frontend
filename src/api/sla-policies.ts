import { apiFetch } from "./client";
import type { SlaPolicy, TicketPriority } from "@/types/models";

export type SlaPolicyInput = {
  name: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  enabled: boolean;
};

export const listSlaPolicies = (token: string) =>
  apiFetch<SlaPolicy[]>("/sla-policies", { token, cache: "no-store" });

export const createSlaPolicy = (token: string, body: SlaPolicyInput) =>
  apiFetch<SlaPolicy>("/sla-policies", { method: "POST", token, body });

export const updateSlaPolicy = (
  token: string,
  policyId: string,
  body: Partial<SlaPolicyInput>,
) =>
  apiFetch<SlaPolicy>(`/sla-policies/${policyId}`, {
    method: "PATCH",
    token,
    body,
  });

export const deleteSlaPolicy = (token: string, policyId: string) =>
  apiFetch<SlaPolicy>(`/sla-policies/${policyId}`, {
    method: "DELETE",
    token,
  });
