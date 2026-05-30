import { WidgetClient } from "@/features/widget/widget-client";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  const publicKey = params.key ?? "";

  return (
    <div className="min-h-screen bg-transparent">
      <WidgetClient publicKey={publicKey} />
    </div>
  );
}
