import { WidgetHelpCenter } from "@/features/widget/widget-help-center";

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
