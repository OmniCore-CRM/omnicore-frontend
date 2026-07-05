import { apiFetch } from "./client";
import { normalizeAuthResponse, normalizeMeResponse } from "./normalize";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AcceptInviteRequest,
} from "@/types/api";

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

export async function forgotPasswordApi(body: ForgotPasswordRequest): Promise<void> {
  await apiFetch<void>("/auth/forgot-password", {
    method: "POST",
    body,
  });
}

export async function resetPasswordApi(body: ResetPasswordRequest): Promise<void> {
  await apiFetch<void>("/auth/reset-password", {
    method: "POST",
    body,
  });
}

export async function validateInviteTokenApi(token: string): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  expiresAt: string;
}> {
  return apiFetch(`/auth/invite/validate?token=${encodeURIComponent(token)}`);
}

export async function acceptInviteApi(body: AcceptInviteRequest): Promise<{
  email: string;
  firstName: string;
}> {
  return apiFetch("/auth/invite/accept", {
    method: "POST",
    body,
  });
}
