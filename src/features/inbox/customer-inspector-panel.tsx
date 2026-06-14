"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversation } from "@/api/conversations";
import { getCustomer } from "@/api/customers";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TagPills } from "@/features/tags/tag-editor";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function CustomerInspectorPanel({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
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
      <aside className="hidden min-h-0 w-[280px] shrink-0 border-l border-oc-border bg-oc-bg-mid/50 xl:flex xl:flex-col xl:items-center xl:justify-center xl:p-5">
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

  const content = (
    <>
      <div className="shrink-0 border-b border-oc-border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
            Customer
          </p>
          {onCloseMobile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 px-0 xl:hidden"
              onClick={onCloseMobile}
              aria-label="Close customer details"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {cLoading || cuLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="mx-auto h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center text-center">
            <Avatar
              src={customer?.avatarUrl || conversation?.customer?.avatarUrl}
              name={display}
              size={64}
            />
            <p className="mt-3 text-base font-semibold text-oc-text">
              {display}
            </p>
            <p className="text-sm text-oc-muted">{customer?.email || "—"}</p>
            <p className="text-sm text-oc-muted">{customer?.phone || "—"}</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <Card className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
            Contact
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-oc-muted">Email</dt>
              <dd className="min-w-0 truncate text-oc-text">
                {customer?.email || conversation?.customer?.email || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-oc-muted">Phone</dt>
              <dd className="min-w-0 truncate text-oc-text">
                {customer?.phone || conversation?.customer?.phone || "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            <TagPills tags={customer?.tags} />
          </div>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
            Channels
          </p>
          {customer?.identities?.length ? (
            customer.identities.map((id) => (
              <div
                key={`${id.channel}-${id.externalId}`}
                className="flex items-center justify-between rounded-lg border border-oc-border bg-oc-bg/40 px-3 py-2 text-sm"
              >
                <span className="text-oc-muted">{id.channel}</span>
                <span className="max-w-[150px] truncate font-mono text-xs text-oc-text">
                  {id.label || id.externalId}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-oc-muted">
              No channel identities returned.
            </p>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
            Activity
          </p>
          <ul className="space-y-2 text-sm text-oc-muted">
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
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden min-h-0 w-[280px] shrink-0 flex-col border-l border-oc-border bg-oc-bg-mid/50 xl:flex">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            aria-label="Close customer details"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside
            className={cn(
              "absolute right-0 top-0 flex h-full w-[min(92vw,380px)] flex-col border-l border-oc-border bg-oc-bg-mid shadow-2xl shadow-black/40",
            )}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
