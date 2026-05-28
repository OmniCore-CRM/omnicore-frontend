"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "@/api/conversations";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import type { Conversation } from "@/types/models";

export default function ConversationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.conversations({ view: "all" }),
    queryFn: () => listConversations(token!, { limit: 100 }),
    enabled: !!token,
  });

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header>
          <h1 className="text-lg font-semibold text-oc-text">Conversations</h1>
          <p className="text-sm text-oc-muted">
            Operational list view — triage from{" "}
            <Link href="/inbox" className="text-oc-accent-2 hover:underline">
              Unified Inbox
            </Link>{" "}
            for realtime messaging.
          </p>
        </header>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oc-border bg-oc-bg/60 text-[11px] uppercase tracking-wide text-oc-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-oc-border/60">
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))}
              {error && (
                <tr>
                  <td className="px-4 py-6 text-oc-danger" colSpan={6}>
                    Failed to load conversations.
                  </td>
                </tr>
              )}
              {data?.items.map((c: Conversation) => (
                <tr
                  key={c.id}
                  className="border-b border-oc-border/40 hover:bg-oc-panel/40"
                >
                  <td className="px-4 py-3 font-medium text-oc-text">
                    {c.customer?.firstName ||
                      c.customer?.email ||
                      "Customer"}
                  </td>
                  <td className="px-4 py-3 text-oc-muted">
                    {c.channel ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral" className="normal-case">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-oc-muted">
                    {c.assignee?.displayName || c.assignee?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-oc-faint">
                    {c.updatedAt ? formatRelative(c.updatedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/inbox?c=${encodeURIComponent(c.id)}`}
                      className="text-xs font-medium text-oc-accent-2 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
