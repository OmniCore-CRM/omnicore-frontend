"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";

export default function TeamsPage() {
  const company = useAuthStore((s) => s.company);
  const error = null;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-oc-text">Teams</h1>
        <p className="text-sm text-oc-muted">
          Company team management infrastructure is planned for a future backend module.
        </p>
      </header>

      <div className="mb-4 rounded-xl border border-oc-border bg-oc-panel p-4">
        <p className="text-sm text-oc-muted">
          Current company:
          <span className="ml-2 font-medium text-oc-text">
            {company?.name ?? "OmniCore"}
          </span>
        </p>
      </div>

      {error && (
        <p className="text-sm text-oc-danger">
          Team management backend module is not implemented yet.
        </p>
      )}

      <div className="mx-auto grid max-w-3xl gap-3">
        <Card className="p-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-oc-text">
              Team module coming soon
            </h2>

            <p className="text-sm text-oc-muted">
              Your backend currently supports:
            </p>

            <ul className="list-disc space-y-1 pl-5 text-sm text-oc-muted">
              <li>Authentication</li>
              <li>Company-based multi-tenancy</li>
              <li>Customers</li>
              <li>Conversations</li>
              <li>Realtime messaging</li>
              <li>WhatsApp integration</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
