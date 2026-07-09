import { WidgetLanding } from "@/features/widget/widget-landing";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key = "" } = await searchParams;
  return <WidgetLanding publicKey={key} />;
}

