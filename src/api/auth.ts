import { apiFetch } from "./client";
import { normalizeAuthResponse, normalizeMeResponse } from "./normalize";
import type { LoginRequest, RegisterRequest } from "@/types/api";

export async function loginApi(body: LoginRequest) {
  const raw = await apiFetch<unknown>("/auth/login", {
    method: "POST",
    body,
  });

  return normalizeAuthResponse(raw);
}

export async function registerApi(body: RegisterRequest) {
  const raw = await apiFetch<unknown>("/auth/register", {
    method: "POST",
    body,
  });

  return normalizeAuthResponse(raw);
}

export async function refreshSessionApi() {
  const raw = await apiFetch<unknown>("/auth/refresh", { method: "POST" });
  return normalizeAuthResponse(raw);
}

export async function fetchCurrentSession(token: string) {
  const raw = await apiFetch<unknown>("/auth/me", { token });
  return normalizeMeResponse(raw);
}

export async function logoutApi(token?: string | null): Promise<void> {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    token,
  });
}
