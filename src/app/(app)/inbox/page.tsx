import { Suspense } from "react";
import { InboxView } from "@/features/inbox/inbox-view";

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6 text-sm text-oc-muted">
          Loading inbox…
        </div>
      }
    >
      <InboxView />
    </Suspense>
  );
}
