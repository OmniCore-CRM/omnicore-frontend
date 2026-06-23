import { getApiBaseUrl } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, handleResponse, readJson } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  rawBody?: BodyInit;
}

let refreshPromise: Promise<string | null> | null = null;

function isAuthEndpoint(path: string) {
  return path.startsWith("/auth/");
}

function invalidateSession() {
  try {
    useAuthStore.getState().clearSession();
    localStorage.removeItem("omnicore-auth");
    window.location.replace("/login");
  } catch {
    // Ignore invalidation cleanup failures.
  }
}

function joinUrl(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(joinUrl(getApiBaseUrl(), "/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return null;

      const body = await readJson(res);
      const payload =
        body && typeof body === "object" && "data" in body
          ? (body as { data?: unknown }).data
          : body;

      if (!payload || typeof payload !== "object") return null;
      const record = payload as Record<string, unknown>;
      if (
        typeof record.accessToken !== "string" ||
        !record.user ||
        typeof record.user !== "object" ||
        !record.company ||
        typeof record.company !== "object"
      ) {
        return null;
      }

      useAuthStore.getState().setSession({
        accessToken: record.accessToken,
        user: record.user as never,
        company: record.company as never,
      });

      return record.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestOptions,
  retryOnUnauthorized: boolean,
): Promise<T> {
  const { token, body, rawBody, method = "GET", headers: hdrs, ...rest } =
    options;
  const headers = new Headers(hdrs);
  let reqBody: BodyInit | undefined = rawBody;
  if (body !== undefined && rawBody === undefined) {
    headers.set("Content-Type", "application/json");
    reqBody = JSON.stringify(body);
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(joinUrl(getApiBaseUrl(), path), {
    method,
    headers,
    body: reqBody,
    credentials: "include",
    ...rest,
  });

  if (res.status === 204) return undefined as T;

  if (res.status === 401 && retryOnUnauthorized && !isAuthEndpoint(path)) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return request<T>(path, { ...options, token: nextToken }, false);
    }
  }

  if (res.status === 401) {
    const payload = (await readJson(res)) as
      | { message?: string; error?: string }
      | undefined;
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Unauthorized";

    if (!isAuthEndpoint(path)) {
      invalidateSession();
    }
    throw new ApiError(401, message, payload);
  }

  return handleResponse<T>(res);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(path, options, true);
}

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

export async function apiDownload(
  path: string,
  options: Pick<RequestOptions, "token" | "headers"> = {},
): Promise<Blob> {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const res = await fetch(joinUrl(getApiBaseUrl(), path), {
    headers,
    credentials: "include",
  });

  if (!res.ok) return handleResponse<never>(res);

  return res.blob();
}

export { readJson };
