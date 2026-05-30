import { apiFetch } from "./client";
import type { AuthUser } from "@/types/models";

export async function listUsers(token: string): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>("/users", {
    token,
  });
}
