import { getApiBaseUrl } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, handleResponse, readJson } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  /** Skip JSON Content-Type (e.g. FormData) */
  rawBody?: BodyInit;
}

// Centralized forced logout/session invalidation.
// Triggered when backend reports expired JWT sessions.
function invalidateSession() {
  try {
    useAuthStore.getState().clearSession();

    // Clear persisted Zustand auth state.
    // Persist key matches the Zustand persist storage name.
    localStorage.removeItem("omnicore-auth");

    // Force hard navigation back to authentication flow.
    window.location.replace("/login");
  } catch {
    // Ignore invalidation cleanup failures.
  }
}

function joinUrl(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Centralized API transport layer.
 *
 * Responsibilities:
 * - auth header injection
 * - JSON serialization
 * - multipart/raw body support
 * - standardized response handling
 * - backend transport abstraction
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, body, rawBody, method = "GET", headers: hdrs, ...rest } =
    options;
  const headers = new Headers(hdrs);
  let reqBody: BodyInit | undefined = rawBody;
  if (body !== undefined && rawBody === undefined) {
    headers.set("Content-Type", "application/json");
    reqBody = JSON.stringify(body);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(joinUrl(getApiBaseUrl(), path), {
    method,
    headers,
    body: reqBody,
    credentials: "include",
    ...rest,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  // Centralized JWT/session expiration handling.
  // Backend now returns explicit auth failure reasons.
  if (res.status === 401) {
    const payload = (await readJson(res)) as
      | {
          message?: string;
          error?: string;
        }
      | undefined;

    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Unauthorized";

    // Any authenticated 401 response means the current
    // frontend session is no longer valid.
    invalidateSession();

    throw new ApiError(401, message, payload);
  }

  return handleResponse<T>(res);
}

/** For mutations that may return non-JSON error bodies */
export async function apiFetchSafe<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw e;
  }
}

export { readJson };
