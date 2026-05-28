const DEFAULT_API = "http://localhost:5001/api/v1";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API;
  return stripTrailingSlash(raw);
}

/** Socket.IO origin — backend may mount on same host as REST. */
export function getSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);
  try {
    const api = new URL(getApiBaseUrl());
    return `${api.protocol}//${api.host}`;
  } catch {
    return "http://localhost:5001";
  }
}
