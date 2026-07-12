import type { Metadata } from "next";
import { WidgetLanding } from "@/features/widget/widget-landing";
import {
  apiBrandingImageUrl,
  buildSupportMetadata,
  fetchSupportBootstrap,
  supportPath,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug } = await params;
  const slug = companySlug.trim().toLowerCase();
  const bootstrap = await fetchSupportBootstrap(slug);

  if (!bootstrap) {
    return buildSupportMetadata({
      title: "Support Portal Unavailable | OmniCore",
      description: "This support portal is unavailable right now.",
      canonicalPath: supportPath(slug),
      index: false,
    });
  }

  const companyName = bootstrap.companyDisplayName?.trim() || "Support";
  const title = `${companyName} Support Portal`;
  const description =
    bootstrap.welcomeSubtitle?.trim() ||
    "Contact support, browse answers, and get help quickly.";

  return buildSupportMetadata({
    title,
    description,
    canonicalPath: supportPath(slug),
    index: true,
    imageUrl:
      apiBrandingImageUrl(bootstrap.heroImageUrl) ??
      apiBrandingImageUrl(bootstrap.logoUrl),
    siteName: companyName,
  });
}

export default async function SupportPortalPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  return <WidgetLanding companySlug={companySlug} />;
}
