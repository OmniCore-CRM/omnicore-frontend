import { WidgetLanding } from "@/features/widget/widget-landing";

export default async function SupportPortalPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  return <WidgetLanding companySlug={companySlug} />;
}
