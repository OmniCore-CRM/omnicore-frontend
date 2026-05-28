import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type { Customer } from "@/types/models";

export interface CustomerListParams {
  search?: string;
  cursor?: string;
  limit?: number;
}

// Fetch paginated company customers for inbox and CRM views.
export async function listCustomers(
  token: string,
  params: CustomerListParams = {},
): Promise<Paginated<Customer>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/customers${qs ? `?${qs}` : ""}`, {
    token,
  });
  return normalizePaginated<Customer>(raw);
}

export async function getCustomer(
  token: string,
  id: string,
): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`, { token });
}

// Partial customer updates.
// Optional enrichment fields like tags remain frontend-safe until dedicated CRM modules exist.
export async function patchCustomer(
  token: string,
  id: string,
  body: Partial<
    Pick<Customer, "firstName" | "lastName" | "email" | "phone" | "tags">
  >,
): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}
