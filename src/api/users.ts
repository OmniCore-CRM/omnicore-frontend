import { apiFetch } from "./client";
import type { AuthUser, UserLifecycleStatus, UserRole } from "@/types/models";

export async function listUsers(token: string): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>("/users", {
    token,
    cache: "no-store",
  });
}

export async function createUser(
  token: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserLifecycleStatus;
  },
): Promise<AuthUser> {
  return apiFetch<AuthUser>("/users", {
    method: "POST",
    token,
    body,
  });
}

export async function updateUser(
  token: string,
  userId: string,
  body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: UserRole;
  },
): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${userId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function updateUserStatus(
  token: string,
  userId: string,
  status: UserLifecycleStatus,
): Promise<AuthUser> {
  return apiFetch<AuthUser>(`/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}
