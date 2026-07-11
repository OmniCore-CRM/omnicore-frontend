import { WidgetContactSupport } from "@/features/widget/widget-contact-support";

export default async function SupportContactPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  return <WidgetContactSupport companySlug={companySlug} />;
}
