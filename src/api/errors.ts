
/**
 * Standardized transport-level API error.
 *
 * Preserves:
 * - HTTP status
 * - backend response body
 * - user-facing message
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (typeof o.error === "string") return o.error;
  if (Array.isArray(o.errors) && o.errors.length) {
    const first = o.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "message" in first) {
      return String((first as { message?: string }).message ?? fallback);
    }
  }
  return fallback;
}

export function unwrapPayload<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const body = await readJson(res);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      extractMessage(body, res.statusText || "Request failed"),
      body,
    );
  }
  return unwrapPayload<T>(body);
}

/** Surfaces API and normalization errors in UI (not only ApiError). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (err.status >= 500) {
      return "Unexpected server error. Please try again.";
    }

    return err.message;
  }

  if (err instanceof TypeError) {
    const message = err.message.toLowerCase();
    if (message.includes("fetch") || message.includes("network")) {
      return "Network error. Check your connection and try again.";
    }
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
