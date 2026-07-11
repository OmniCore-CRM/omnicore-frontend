import { WidgetHelpCenter } from "@/features/widget/widget-help-center";

export default async function WidgetHelpCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; category?: string; search?: string }>;
}) {
  const { key = "", category = "", search = "" } = await searchParams;

  return (
    <WidgetHelpCenter
      publicKey={key}
      initialCategory={category}
      initialSearch={search}
    />
  );
}
