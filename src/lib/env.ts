const DEFAULT_API = "http://localhost:5001/api/v1";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function readPublicUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim() || fallback;
  let parsed: URL;
  try {
    parsed = new URL(raw);
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

export function getApiBaseUrl(): string {
  return readPublicUrl("NEXT_PUBLIC_API_BASE_URL", DEFAULT_API);
}

/** Socket.IO origin — backend may mount on same host as REST. */
export function getSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return readPublicUrl("NEXT_PUBLIC_SOCKET_URL", explicit);
  const api = new URL(getApiBaseUrl());
  return `${api.protocol}//${api.host}`;
}
