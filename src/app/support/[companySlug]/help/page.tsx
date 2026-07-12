import type { Metadata } from "next";
import { WidgetHelpCenter } from "@/features/widget/widget-help-center";
import {
  apiBrandingImageUrl,
  buildSupportMetadata,
  fetchSupportHelpCenter,
  supportPath,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug } = await params;
  const slug = companySlug.trim().toLowerCase();
  const helpCenter = await fetchSupportHelpCenter(slug);

  if (!helpCenter) {
    return buildSupportMetadata({
      title: "Help Centre Unavailable | OmniCore",
      description: "This help centre is unavailable right now.",
      canonicalPath: supportPath(slug, "/help"),
      index: false,
    });
  }

  const companyName = helpCenter.companyDisplayName?.trim() || "Support";
  const title = `${companyName} Help Centre`;
  const description =
    helpCenter.welcomeSubtitle?.trim() ||
    "Browse published support articles and find quick answers.";
  const hasPublishedArticles = helpCenter.articles.length > 0;

  return buildSupportMetadata({
    title,
    description,
    canonicalPath: supportPath(slug, "/help"),
    index: hasPublishedArticles,
    imageUrl:
      apiBrandingImageUrl(helpCenter.heroImageUrl) ??
      apiBrandingImageUrl(helpCenter.logoUrl),
    siteName: companyName,
  });
}

export default async function SupportHelpCenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { companySlug } = await params;
  const { category = "", search = "" } = await searchParams;

  return (
    <WidgetHelpCenter
      companySlug={companySlug}
      initialCategory={category}
      initialSearch={search}
    />
  );
}
