"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversation } from "@/api/conversations";
import { getCustomer } from "@/api/customers";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";

export function CustomerInspectorPanel() {
  const token = useAuthStore((s) => s.accessToken);
  const selectedId = useInboxStore((s) => s.selectedConversationId);

  const { data: conversation, isLoading: cLoading } = useQuery({
    queryKey: queryKeys.conversation(selectedId ?? "_"),
    queryFn: () => getConversation(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  const customerId = conversation?.customerId;

  // Fetch expanded customer CRM context for the selected conversation.
  const { data: customer, isLoading: cuLoading } = useQuery({
    queryKey: queryKeys.customer(customerId ?? "_"),
    queryFn: () => getCustomer(token!, customerId!),
    enabled: !!token && !!customerId,
  });

  if (!selectedId) {
    return (
      <aside className="hidden min-h-0 w-[300px] shrink-0 border-l border-oc-border bg-oc-bg-mid/50 xl:flex xl:flex-col xl:items-center xl:justify-center xl:p-6">
        <p className="text-center text-xs text-oc-muted">
          Customer context appears when a thread is selected.
        </p>
      </aside>
    );
  }

  const customerName = [
    customer?.firstName || conversation?.customer?.firstName,
    customer?.lastName || conversation?.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const display =
    customerName ||
    customer?.email ||
    conversation?.customer?.email ||
    customer?.phone ||
    "Customer";

  return (
    <aside className="hidden min-h-0 w-[min(100%,340px)] shrink-0 flex-col border-l border-oc-border bg-oc-bg-mid/40 xl:flex">
      <div className="border-b border-oc-border p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
          Customer
        </p>
        {cLoading || cuLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="mx-auto h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center text-center">
            <Avatar
              src={customer?.avatarUrl || conversation?.customer?.avatarUrl}
              name={display}
              size={56}
            />
            <p className="mt-2 text-sm font-semibold text-oc-text">{display}</p>
            <p className="text-xs text-oc-muted">{customer?.email}</p>
            <p className="text-xs text-oc-muted">{customer?.phone}</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <Card className="space-y-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
            Tags
          </p>
          <div className="flex flex-wrap gap-1">
            {(customer?.tags?.length ? customer.tags : ["—"]).map((t, i) => (
              <Badge key={`${t}-${i}`} tone="neutral" className="normal-case">
                {t}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="space-y-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
            Channels
          </p>
          {customer?.identities?.length ? (
            customer.identities.map((id) => (
              <div
                key={`${id.channel}-${id.externalId}`}
                className="flex items-center justify-between rounded-lg border border-oc-border bg-oc-bg/40 px-2 py-1.5 text-xs"
              >
                <span className="text-oc-muted">{id.channel}</span>
                <span className="max-w-[140px] truncate font-mono text-[11px] text-oc-text">
                  {id.label || id.externalId}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-oc-muted">
              {/* Future omnichannel identity mapping (WhatsApp, email, web, etc). */}
              No channel identities returned.
            </p>
          )}
        </Card>

        <Card className="space-y-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
            Activity
          </p>
          <ul className="space-y-2 text-xs text-oc-muted">
            <li>
              Updated{" "}
              {customer?.updatedAt
                ? formatRelative(customer.updatedAt)
                : "—"}
            </li>
            <li>
              Created{" "}
              {customer?.createdAt
                ? formatRelative(customer.createdAt)
                : "—"}
            </li>
          </ul>
        </Card>

        <Card className="space-y-2 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
            Internal notes
          </p>
          <p className="text-xs text-oc-muted">
            {/* Internal CRM notes will connect to a future notes module. */}
            Notes API not wired — add endpoint integration here.
          </p>
        </Card>
      </div>
    </aside>
  );
}
