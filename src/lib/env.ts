const DEFAULT_DEV_API = "http://localhost:5001/api/v1";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function readPublicUrl(name: string, value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${name} must not include credentials`);
  }

  return stripTrailingSlash(parsed.toString());
}

function requiredPublicUrl(
  name: string,
  configured: string | undefined,
  developmentFallback?: string,
): string {
  const value = configured?.trim();
  if (value) return readPublicUrl(name, value);

  if (process.env.NODE_ENV !== "production" && developmentFallback) {
    return readPublicUrl(name, developmentFallback);
  }

  throw new Error(`${name} is required in production`);
}

export function getApiBaseUrl(): string {
  return requiredPublicUrl(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEFAULT_DEV_API,
  );
}

/** Socket.IO origin — backend may mount on same host as REST. */
export function getSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return readPublicUrl("NEXT_PUBLIC_SOCKET_URL", explicit);
  const api = new URL(getApiBaseUrl());
  return `${api.protocol}//${api.host}`;
}
