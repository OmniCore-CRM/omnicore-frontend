import { apiFetch } from "./client";
import { normalizeAuthResponse, normalizeMeResponse } from "./normalize";

import type {
  LoginRequest,
  RegisterRequest,
} from "@/types/api";

/**
 * Authentication API layer.
 *
 * Responsible for:
 * - login
 * - register
 * - authenticated session hydration
 * - logout
 *
 * All auth responses are normalized into a shared
 * AuthSession structure.
 */

// Authenticate an existing user.
export async function loginApi(body: LoginRequest) {
  const raw = await apiFetch<unknown>("/auth/login", {
    method: "POST",
    body,
  });

  return normalizeAuthResponse(raw);
}

// Create a company and owner account.
export async function registerApi(body: RegisterRequest) {
  const raw = await apiFetch<unknown>("/auth/register", {
    method: "POST",
    body,
  });

  return normalizeAuthResponse(raw);
}

/**
 * Fetch the currently authenticated session.
 *
 * Used for:
 * - page refresh restoration
 * - persistent login hydration
 * - socket auth restoration
 * - protected layouts
 */
export async function fetchCurrentSession(token: string) {
  const raw = await apiFetch<unknown>("/auth/me", { token });
  return normalizeMeResponse(raw);
}

/**
 * JWT logout.
 *
 * Backend logout is optional for stateless JWT auth,
 * but this endpoint allows future support for:
 * - refresh token invalidation
 * - audit logging
 * - session revocation
 */
export async function logoutApi(token: string): Promise<void> {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    token,
  });
}
