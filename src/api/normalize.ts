import type {
  ApiResponse,
  AuthMeResponse,
  AuthResponse,
  Paginated,
} from "@/types/api";

/**
 * Temporary defensive pagination normalizer.
 *
 * Some backend modules are still evolving and may not yet
 * return fully standardized pagination payloads.
 *
 * Once all endpoints follow a strict shared pagination DTO,
 * this helper should be simplified or removed.
 */
export function normalizePaginated<T>(raw: unknown): Paginated<T> {
  if (!raw) {
    return { items: [] };
  }

  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
    };
  }

  if (typeof raw === "object") {
    const payload = raw as Record<string, unknown>;

    // Temporary support for legacy/non-standardized collection keys.
    // Long-term backend pagination responses should standardize on:
    // { items, nextCursor?, total? }
    const items = (
      (Array.isArray(payload.items) && payload.items) ||
      (Array.isArray(payload.data) && payload.data) ||
      (Array.isArray(payload.conversations) && payload.conversations) ||
      (Array.isArray(payload.customers) && payload.customers) ||
      (Array.isArray(payload.messages) && payload.messages) ||
      []
    ) as T[];

    const nextCursor =
      (typeof payload.nextCursor === "string" && payload.nextCursor) ||
      (typeof payload.cursor === "string" && payload.cursor) ||
      undefined;

    const total =
      typeof payload.total === "number"
        ? payload.total
        : undefined;

    return {
      items,
      nextCursor,
      total,
    };
  }

  return {
    items: [],
  };
}

/**
 * Strict auth response normalizer.
 *
 * Backend auth responses are now standardized and should follow:
 *
 * {
 *   success,
 *   message,
 *   data: {
 *     accessToken,
 *     user,
 *     company
 *   }
 * }
 */
export function normalizeAuthResponse(raw: unknown): AuthResponse["data"] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid auth response from server");
  }

  // handleResponse() already unwraps API envelopes,
  // so auth payloads may already be the inner data object.
  const payload = (
    raw &&
    typeof raw === "object" &&
    "data" in raw
      ? (raw as ApiResponse<AuthResponse["data"]>).data
      : raw
  ) as AuthResponse["data"];

  if (!payload || typeof payload !== "object") {
    throw new Error("Missing auth payload in server response");
  }

  const record = payload as unknown as Record<string, unknown>;
  const accessToken =
    (typeof record.accessToken === "string" && record.accessToken) ||
    (typeof record.token === "string" && record.token) ||
    (typeof record.access_token === "string" && record.access_token) ||
    "";

  const user = record.user;
  const company = record.company;

  if (!accessToken) {
    throw new Error("Missing access token in auth response");
  }

  if (!user || typeof user !== "object") {
    throw new Error("Missing authenticated user in auth response");
  }

  if (!company || typeof company !== "object") {
    throw new Error("Missing company in auth response");
  }

  return {
    accessToken,
    user: user as AuthResponse["data"]["user"],
    company: company as AuthResponse["data"]["company"],
  };
}

/**
 * Normalizes GET /auth/me payloads.
 * handleResponse() may already unwrap the API envelope.
 */
export function normalizeMeResponse(raw: unknown): AuthMeResponse["data"] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid session response from server");
  }

  let payload: unknown = raw;
  if ("data" in raw && raw.data && typeof raw.data === "object") {
    payload = (raw as ApiResponse<AuthMeResponse["data"]>).data;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data: unknown }).data &&
    typeof (payload as { data: unknown }).data === "object"
  ) {
    payload = (payload as { data: AuthMeResponse["data"] }).data;
  }

  const session = payload as AuthMeResponse["data"];
  if (!session?.user || typeof session.user !== "object") {
    throw new Error("Missing user in session response");
  }
  if (!session?.company || typeof session.company !== "object") {
    throw new Error("Missing company in session response");
  }

  return session;
}
