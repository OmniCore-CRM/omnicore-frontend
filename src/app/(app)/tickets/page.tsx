"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTicket, listTickets } from "@/api/tickets";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import type { Ticket } from "@/types/models";

function priorityTone(p: Ticket["priority"]) {
  if (p === "URGENT") return "danger" as const;
  if (p === "HIGH") return "warning" as const;
  if (p === "MEDIUM") return "accent" as const;
  return "neutral" as const;
}

export default function TicketsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(() => ({ search: q || undefined }), [q]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.tickets(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v ?? ""])),
    ),
    queryFn: () => listTickets(token!, { search: params.search }),
    enabled: !!token,
  });

  const { data: ticket, isLoading: tLoading } = useQuery({
    queryKey: queryKeys.ticket(selectedId ?? "_"),
    queryFn: () => getTicket(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-oc-text">Tickets</h1>
            <p className="text-sm text-oc-muted">
              SLA-aware triage — link conversations when backend exposes relations.
            </p>
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets…"
            className="h-9 max-w-xs"
          />
        </header>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oc-border bg-oc-bg/60 text-[11px] uppercase tracking-wide text-oc-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-oc-border/60">
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))}
              {error && (
                <tr>
                  <td className="px-4 py-6 text-oc-danger" colSpan={5}>
                    Failed to load tickets.
                  </td>
                </tr>
              )}
              {data?.items.map((t: Ticket) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(t.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer border-b border-oc-border/40 hover:bg-oc-panel/40 ${
                    selectedId === t.id ? "bg-oc-panel/60" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-oc-text">
                    {t.subject}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral" className="normal-case">
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={priorityTone(t.priority)} className="normal-case">
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-oc-muted">
                    {t.assignee?.displayName || t.assignee?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-oc-faint">
                    {t.slaDueAt ? formatRelative(t.slaDueAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <aside className="w-full shrink-0 border-t border-oc-border bg-oc-bg-mid/50 p-4 lg:w-[340px] lg:border-l lg:border-t-0">
        {!selectedId && (
          <p className="text-sm text-oc-muted">Select a ticket for details.</p>
        )}
        {tLoading && <Skeleton className="h-40 w-full rounded-xl" />}
        {ticket && (
          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-oc-text">{ticket.subject}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral" className="normal-case">
                {ticket.status}
              </Badge>
              <Badge tone={priorityTone(ticket.priority)} className="normal-case">
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-xs text-oc-muted">
              Assignee:{" "}
              {ticket.assignee?.displayName || ticket.assignee?.email || "—"}
            </p>
            <p className="text-xs text-oc-muted">
              SLA due:{" "}
              {ticket.slaDueAt ? formatRelative(ticket.slaDueAt) : "Not set"}
            </p>
            <p className="text-xs text-oc-faint">
              {/* TODO: GET /tickets/:id/conversations when available */}
              Linked conversations:{" "}
              {ticket.conversationId ? (
                <span className="font-mono text-oc-text">{ticket.conversationId}</span>
              ) : (
                "—"
              )}
            </p>
          </Card>
        )}
      </aside>
    </div>
  );
}
