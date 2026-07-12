import type { NextConfig } from "next";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:5001/api/v1";

function configuredUrl(name: string) {
  return process.env[name]?.trim() || undefined;
}

function requiredConfigUrl(name: string, developmentFallback?: string) {
  const configured = configuredUrl(name);
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production" && developmentFallback) {
    return developmentFallback;
  }
  throw new Error(`${name} is required in production`);
}

function originFromUrl(name: string, value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`${name} must use http or https`);
    }
    if (url.username || url.password) {
      throw new Error(`${name} must not include credentials`);
    }
    return url.origin;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

function socketOrigins(value: string | undefined) {
  const origin = originFromUrl("NEXT_PUBLIC_SOCKET_URL", value);
  if (!origin) return [];
  const url = new URL(origin);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return [origin, `${wsProtocol}//${url.host}`];
}

const apiBaseUrl = requiredConfigUrl(
  "NEXT_PUBLIC_API_BASE_URL",
  DEFAULT_DEV_API_BASE_URL,
);
const apiOrigin = originFromUrl("NEXT_PUBLIC_API_BASE_URL", apiBaseUrl);
const socketOriginValues = socketOrigins(
  configuredUrl("NEXT_PUBLIC_SOCKET_URL") || apiOrigin || undefined,
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
const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSources = ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])].join(" ");

// Do not set X-Frame-Options or frame-ancestors globally: /widget is
// intentionally embeddable by customer websites and mobile WebViews.
const cspBaseDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'self'",
  "img-src 'self' data: blob: https:" + (isDevelopment ? " http://localhost:* http://127.0.0.1:*" : ""),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSources}`,
  `connect-src ${connectSources.join(" ")}`,
  "form-action 'self'",
];

const appSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [...cspBaseDirectives, "frame-ancestors 'none'"].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const widgetSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspBaseDirectives.join("; "),
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
        source: "/widget",
        headers: widgetSecurityHeaders,
      },
      {
        source: "/widget/:path*",
        headers: widgetSecurityHeaders,
      },
      {
        source: "/((?!widget).*)",
        headers: appSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
