import type { Metadata } from "next";
import { getApiBaseUrl } from "@/lib/env";

type SupportBootstrapPayload = {
  publicKey: string;
  companyDisplayName?: string | null;
  welcomeTitle?: string | null;
  welcomeSubtitle?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
};

type SupportHelpCenterPayload = {
  publicKey: string;
  companyDisplayName?: string | null;
  welcomeTitle?: string | null;
  welcomeSubtitle?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  articles: Array<{
    slug: string;
    title: string;
    summary: string;
    publishedAt?: string | null;
  }>;
};

type SupportArticlePayload = {
  publicKey: string;
  companyDisplayName?: string | null;
  logoUrl?: string | null;
  article: {
    title: string;
    slug: string;
    summary: string;
    content: string;
    publishedAt?: string | null;
    updatedAt?: string;
    category?: {
      name: string;
      slug: string;
    } | null;
  };
};

type SupportSitemapPayload = {
  portals: Array<{
    companySlug: string;
    updatedAt: string;
    articles: Array<{
      slug: string;
      publishedAt?: string | null;
      updatedAt: string;
    }>;
  }>;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

const DEFAULT_WEB_BASE_URL = "http://localhost:3000";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function parseAbsoluteUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return stripTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
}

export function getWebBaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_WEB_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    DEFAULT_WEB_BASE_URL,
  ];

  for (const candidate of candidates) {
    const parsed = candidate ? parseAbsoluteUrl(candidate.trim()) : null;
    if (parsed) return parsed;
  }

  return DEFAULT_WEB_BASE_URL;
}

export function toAbsoluteUrl(path: string) {
  return `${getWebBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function supportPath(companySlug: string, suffix = "") {
  const slug = encodeURIComponent(companySlug.trim().toLowerCase());
  const normalizedSuffix = suffix ? (suffix.startsWith("/") ? suffix : `/${suffix}`) : "";
  return `/support/${slug}${normalizedSuffix}`;
}

export function apiBrandingImageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const apiBase = getApiBaseUrl();
  return `${apiBase}${path.replace("/api/v1", "")}`;
}

async function fetchApiData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as ApiEnvelope<T>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchSupportBootstrap(companySlug: string) {
  const slug = encodeURIComponent(companySlug.trim().toLowerCase());
  return fetchApiData<SupportBootstrapPayload>(
    `/widget/support/${slug}/bootstrap`,
  );
}

export async function fetchSupportHelpCenter(companySlug: string) {
  const slug = encodeURIComponent(companySlug.trim().toLowerCase());
  return fetchApiData<SupportHelpCenterPayload>(
    `/widget/support/${slug}/help-center`,
  );
}

export async function fetchSupportArticle(
  companySlug: string,
  articleSlug: string,
) {
  const slug = encodeURIComponent(companySlug.trim().toLowerCase());
  const encodedArticleSlug = encodeURIComponent(articleSlug.trim().toLowerCase());
  return fetchApiData<SupportArticlePayload>(
    `/widget/support/${slug}/help-center/articles/${encodedArticleSlug}`,
  );
}

export async function fetchSupportSitemapData() {
  const payload = await fetchApiData<SupportSitemapPayload>("/widget/support/sitemap");
  return payload ?? { portals: [] };
}

export function buildSupportMetadata(input: {
  title: string;
  description: string;
  canonicalPath: string;
  index: boolean;
  imageUrl?: string | null;
  siteName?: string;
  type?: "website" | "article";
  publishedTime?: string;
}) {
  const canonicalUrl = toAbsoluteUrl(input.canonicalPath);
  const image = input.imageUrl || undefined;
  const openGraph = {
    title: input.title,
    description: input.description,
    type: input.type ?? "website",
    url: canonicalUrl,
    siteName: input.siteName || "OmniCore Support",
    ...(image
      ? {
          images: [
            {
              url: image,
              alt: input.title,
            },
          ],
        }
      : {}),
    ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
  };

  const twitter = {
    card: (image ? "summary_large_image" : "summary") as "summary" | "summary_large_image",
    title: input.title,
    description: input.description,
    ...(image ? { images: [image] } : {}),
  };

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: input.index,
      follow: input.index,
      googleBot: {
        index: input.index,
        follow: input.index,
      },
    },
    openGraph,
    twitter,
  } satisfies Metadata;
}
