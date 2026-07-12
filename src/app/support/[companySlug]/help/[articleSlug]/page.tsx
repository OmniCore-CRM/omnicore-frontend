import type { Metadata } from "next";
import { WidgetHelpCenterArticle } from "@/features/widget/widget-help-center-article";
import {
  apiBrandingImageUrl,
  buildSupportMetadata,
  fetchSupportArticle,
  supportPath,
  toAbsoluteUrl,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string; articleSlug: string }>;
}): Promise<Metadata> {
  const { companySlug, articleSlug } = await params;
  const slug = companySlug.trim().toLowerCase();
  const articleData = await fetchSupportArticle(slug, articleSlug);

  if (!articleData) {
    return buildSupportMetadata({
      title: "Article Unavailable | OmniCore",
      description: "This article is unavailable or not published.",
      canonicalPath: supportPath(slug, `/help/${articleSlug}`),
      index: false,
    });
  }

  const companyName = articleData.companyDisplayName?.trim() || "Support";
  const article = articleData.article;

  return buildSupportMetadata({
    title: `${article.title} | ${companyName} Help Centre`,
    description: article.summary,
    canonicalPath: supportPath(slug, `/help/${article.slug}`),
    index: Boolean(article.publishedAt),
    imageUrl: apiBrandingImageUrl(articleData.logoUrl),
    siteName: `${companyName} Help Centre`,
    type: "article",
    publishedTime: article.publishedAt ?? undefined,
  });
}

export default async function SupportHelpCenterArticlePage({
  params,
}: {
  params: Promise<{ companySlug: string; articleSlug: string }>;
}) {
  const { companySlug, articleSlug } = await params;
  const slug = companySlug.trim().toLowerCase();
  const articleData = await fetchSupportArticle(slug, articleSlug);

  const articleJsonLd =
    articleData?.article.publishedAt
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: articleData.article.title,
          description: articleData.article.summary,
          datePublished: articleData.article.publishedAt,
          ...(articleData.article.updatedAt
            ? { dateModified: articleData.article.updatedAt }
            : {}),
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": toAbsoluteUrl(
              supportPath(slug, `/help/${articleData.article.slug}`),
            ),
          },
          author: {
            "@type": "Organization",
            name: articleData.companyDisplayName?.trim() || "Support",
          },
          ...(apiBrandingImageUrl(articleData.logoUrl)
            ? { image: [apiBrandingImageUrl(articleData.logoUrl)] }
            : {}),
        }
      : null;

  return (
    <>
      {articleJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd),
          }}
        />
      ) : null}
      <WidgetHelpCenterArticle
        companySlug={companySlug}
        slug={articleSlug}
      />
    </>
  );
}
