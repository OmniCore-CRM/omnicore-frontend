import { WidgetHelpCenterArticle } from "@/features/widget/widget-help-center-article";

export default async function WidgetHelpCenterArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { slug } = await params;
  const { key = "" } = await searchParams;

  return <WidgetHelpCenterArticle publicKey={key} slug={slug} />;
}
