"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCustomer, listCustomers } from "@/api/customers";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import type { Customer } from "@/types/models";

export default function CustomersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(() => ({ search: q || undefined }), [q]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v ?? ""])),
    ),
    queryFn: () => listCustomers(token!, { search: params.search }),
    enabled: !!token,
  });

  const { data: detail, isLoading: dLoading } = useQuery({
    queryKey: queryKeys.customer(selectedId ?? "_"),
    queryFn: () => getCustomer(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 md:flex-row">
      <section className="flex max-md:min-h-[240px] min-h-0 flex-1 flex-col border-oc-border bg-oc-bg-mid md:h-full md:w-[min(100%,380px)] md:border-r">
        <div className="border-b border-oc-border p-4">
          <h1 className="text-sm font-semibold text-oc-text">Customers</h1>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers…"
            className="mt-3 h-9"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}
          {error && (
            <p className="p-4 text-sm text-oc-danger">Failed to load customers.</p>
          )}
          {data?.items.map((c: Customer) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full gap-3 border-b border-oc-border/50 px-4 py-3 text-left hover:bg-oc-panel/50 ${
                selectedId === c.id ? "bg-oc-panel" : ""
              }`}
            >
              <Avatar src={c.avatarUrl} name={c.firstName} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-oc-text">
                  {c.firstName}
                </p>
                <p className="truncate text-xs text-oc-muted">{c.email}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {!selectedId && (
          <p className="text-sm text-oc-muted">
            Select a customer to view profile, tags, and channel identities.
          </p>
        )}
        {selectedId && dLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        )}
        {detail && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar src={detail.avatarUrl} name={detail.firstName} size={64} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-oc-text">
                    {detail.firstName} {detail.lastName}
                  </h2>
                  <p className="text-sm text-oc-muted">{detail.email}</p>
                  <p className="text-sm text-oc-muted">{detail.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(detail.tags ?? []).map((t) => (
                      <Badge key={t} tone="neutral" className="normal-case">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                Conversation history
              </h3>
              <p className="mt-2 text-sm text-oc-muted">
                {/* TODO: backend timeline endpoint (e.g. GET /customers/:id/timeline) */}
                Link customer timeline API here for a chronological support
                history view.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                Metadata
              </h3>
              <p className="mt-2 text-xs text-oc-muted">
                Updated{" "}
                {detail.updatedAt ? formatRelative(detail.updatedAt) : "—"}
              </p>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
