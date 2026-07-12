import type { Metadata } from "next";
import { WidgetContactSupport } from "@/features/widget/widget-contact-support";
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
      title: "Contact Support Unavailable | OmniCore",
      description: "This contact support page is unavailable right now.",
      canonicalPath: supportPath(slug, "/contact"),
      index: false,
    });
  }

  const companyName = bootstrap.companyDisplayName?.trim() || "Support";

  return buildSupportMetadata({
    title: `Contact ${companyName} Support`,
    description:
      "Send a support request and receive responses through the support inbox.",
    canonicalPath: supportPath(slug, "/contact"),
    index: true,
    imageUrl:
      apiBrandingImageUrl(bootstrap.heroImageUrl) ??
      apiBrandingImageUrl(bootstrap.logoUrl),
    siteName: companyName,
  });
}

export default async function SupportContactPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  return <WidgetContactSupport companySlug={companySlug} />;
}
