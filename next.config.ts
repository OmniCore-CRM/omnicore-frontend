import type { NextConfig } from "next";

const DEFAULT_API_BASE_URL = "http://localhost:5001/api/v1";

function originFromUrl(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
}

function socketOrigins(value: string | undefined) {
  const origin = originFromUrl(value);
  if (!origin) return [];
  const url = new URL(origin);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return [origin, `${wsProtocol}//${url.host}`];
}

const apiOrigin = originFromUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
);
const socketOriginValues = socketOrigins(
  process.env.NEXT_PUBLIC_SOCKET_URL || apiOrigin || undefined,
);
const connectSources = Array.from(
  new Set([
    "'self'",
    apiOrigin,
    ...socketOriginValues,
    "http://localhost:*",
    "ws://localhost:*",
    "http://127.0.0.1:*",
    "ws://127.0.0.1:*",
  ].filter(Boolean) as string[]),
);

// Do not set X-Frame-Options or frame-ancestors globally: /widget is
// intentionally embeddable by customer websites and mobile WebViews.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-src 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      `connect-src ${connectSources.join(" ")}`,
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
