"use client";

import { useSearchParams } from "next/navigation";
import { WidgetClient } from "@/features/widget/widget-client";

export default function WidgetPage() {
  const searchParams = useSearchParams();
  const publicKey = searchParams.get("key") ?? "";

  return (
    <div className="min-h-screen bg-transparent">
      <WidgetClient publicKey={publicKey} />
    </div>
  );
}
