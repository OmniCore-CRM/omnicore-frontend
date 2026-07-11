import { WidgetHelpCenterArticle } from "@/features/widget/widget-help-center-article";

export default async function SupportHelpCenterArticlePage({
  params,
}: {
  params: Promise<{ companySlug: string; articleSlug: string }>;
}) {
  const { companySlug, articleSlug } = await params;

  return (
    <WidgetHelpCenterArticle
      companySlug={companySlug}
      slug={articleSlug}
    />
  );
}
