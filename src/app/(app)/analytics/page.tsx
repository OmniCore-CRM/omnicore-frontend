"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview } from "@/api/analytics";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-oc-text">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-oc-muted">{hint}</p>}
    </Card>
  );
}

function SparkPlaceholder({ label }: { label: string }) {
  const heights = [40, 65, 45, 80, 55, 70, 50, 90, 60, 75, 48, 82];
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
        {label}
      </p>
      <div className="mt-4 flex h-36 items-end gap-1">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-violet-950/40 to-violet-500/50"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-oc-muted">
        Placeholder chart shell — swap for Recharts / Visx when time series API
        is finalized.
      </p>
    </Card>
  );
}

export default function AnalyticsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.analyticsOverview,
    queryFn: () => getAnalyticsOverview(token!),
    enabled: !!token,
    retry: false,
  });

  const fmt = (n?: number) =>
    n === undefined || Number.isNaN(n) ? "—" : n.toLocaleString();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-oc-text">Analytics</h1>
        <p className="text-sm text-oc-muted">
          Operational KPIs sourced from the analytics module when available.
        </p>
        {isError && (
          <p className="mt-2 text-xs text-oc-warning">
            {/* TODO: confirm GET /analytics/overview exists on backend */}
            Overview endpoint unavailable — showing empty shell until the route
            responds.
          </p>
        )}
      </header>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Messages (24h)"
            value={fmt(data?.messageVolume24h)}
            hint="Inbound + outbound volume"
          />
          <Kpi
            label="Messages (7d)"
            value={fmt(data?.messageVolume7d)}
            hint="Rolling weekly load"
          />
          <Kpi
            label="Avg first response"
            value={
              data?.avgFirstResponseMinutes !== undefined
                ? `${data.avgFirstResponseMinutes}m`
                : "—"
            }
            hint="Team responsiveness"
          />
          <Kpi
            label="Active conversations"
            value={fmt(data?.activeConversations)}
            hint="Open operational threads"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SparkPlaceholder label="Message volume trend" />
        <SparkPlaceholder label="Customer growth" />
      </div>
    </div>
  );
}
