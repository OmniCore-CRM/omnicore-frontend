"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Search,
  TicketIcon,
  UserRound,
} from "lucide-react";
import { getCustomer, listCustomers } from "@/api/customers";
import { listTags } from "@/api/tags";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TagEditor, TagPills } from "@/features/tags/tag-editor";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  Customer,
  CustomerConversationSummary,
  CustomerTicketSummary,
  CustomerTimelineItem,
  TicketPriority,
  TicketStatus,
} from "@/types/models";

const displayCustomerName = (customer?: Customer | null) =>
  [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
  customer?.email ||
  customer?.phone ||
  "Customer";

const channelLabel = (channel?: string | null) => {
  if (!channel) return "Channel";
  if (channel === "WHATSAPP") return "WhatsApp";
  if (channel === "WEBSITE") return "Website";
  return channel.charAt(0) + channel.slice(1).toLowerCase();
};

const channelTone = (channel?: string | null) => {
  if (channel === "WHATSAPP") return "success" as const;
  if (channel === "WEBSITE") return "accent" as const;
  return "neutral" as const;
};

const statusTone = (status?: TicketStatus | string) => {
  if (status === "RESOLVED" || status === "CLOSED") return "success" as const;
  if (status === "ESCALATED") return "danger" as const;
  if (status === "PENDING") return "warning" as const;
  return "neutral" as const;
};

const priorityTone = (priority?: TicketPriority) => {
  if (priority === "URGENT") return "danger" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "MEDIUM") return "accent" as const;
  return "neutral" as const;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const displayUser = (user?: CustomerTicketSummary["assignee"] | null) =>
  user?.displayName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "Unassigned";

const timelineIconClass = (type: CustomerTimelineItem["type"]) => {
  if (type.includes("MESSAGE")) return "bg-emerald-500/20 text-emerald-200";
  if (type.includes("TICKET")) return "bg-violet-500/20 text-violet-200";
  return "bg-oc-panel text-oc-muted";
};

const filterControlClass =
  "mt-1 h-10 w-full min-w-0 rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent";

const daysAgo = (days: string) =>
  days
    ? new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

export default function CustomersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [q, setQ] = useState("");
  const debouncedSearch = useDebouncedValue(q);
  const [tagId, setTagId] = useState("");
  const [createdWithin, setCreatedWithin] = useState("");
  const [activeWithin, setActiveWithin] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resetPagination = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      tagId: tagId || undefined,
      createdFrom: daysAgo(createdWithin),
      lastActivityFrom: daysAgo(activeWithin),
      cursor,
      limit: 30,
    }),
    [activeWithin, createdWithin, cursor, debouncedSearch, tagId],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers(
      Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
          key,
          String(value ?? ""),
        ]),
      ),
    ),
    queryFn: () => listCustomers(token!, params),
    enabled: !!token,
  });

  const {
    data: detail,
    isLoading: dLoading,
    error: detailError,
  } = useQuery({
    queryKey: queryKeys.customer(selectedId ?? "_"),
    queryFn: () => getCustomer(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  const customers = data?.items ?? [];
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => listTags(token!),
    enabled: !!token,
  });

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <section
        className={cn(
          "min-h-0 min-w-0 flex-col border-oc-border bg-oc-bg-mid/90 md:flex md:w-[360px] md:shrink-0 md:border-r xl:w-[410px]",
          selectedId ? "hidden md:flex" : "flex flex-1",
        )}
      >
        <div className="shrink-0 border-b border-oc-border p-4 md:p-5">
          <p className="text-xs font-semibold uppercase text-oc-faint">
            CRM records
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-oc-text">Customers</h1>
              <p className="mt-1 text-sm text-oc-muted">
                Customer identity and support history.
              </p>
            </div>
            <span className="rounded-full border border-oc-border bg-oc-panel px-2.5 py-1 text-xs font-medium text-oc-muted">
              {isLoading ? "..." : customers.length}
            </span>
          </div>
          <label className="relative mt-4 block">
            <span className="sr-only">Search customers</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oc-faint" />
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                resetPagination();
              }}
              placeholder="Search name, email, or phone..."
              className="h-11 pl-10"
            />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <label className="min-w-0 text-xs font-semibold text-oc-faint">
              Tag
              <select
                value={tagId}
                onChange={(event) => {
                  setTagId(event.target.value);
                  resetPagination();
                }}
                className={filterControlClass}
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-xs font-semibold text-oc-faint">
              Created
              <select
                value={createdWithin}
                onChange={(event) => {
                  setCreatedWithin(event.target.value);
                  resetPagination();
                }}
                className={filterControlClass}
              >
                <option value="">Any time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
            <label className="min-w-0 text-xs font-semibold text-oc-faint">
              Activity
              <select
                value={activeWithin}
                onChange={(event) => {
                  setActiveWithin(event.target.value);
                  resetPagination();
                }}
                className={filterControlClass}
              >
                <option value="">Any time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-[88px] w-full rounded-lg" />
              ))}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
              {getErrorMessage(error, "Failed to load customers.")}
            </div>
          )}
          {!isLoading && !error && customers.length === 0 && (
            <div className="rounded-xl border border-dashed border-oc-border bg-oc-panel/30 p-6 text-center">
              <UserRound className="mx-auto h-8 w-8 text-oc-faint" />
              <p className="mt-3 text-sm font-semibold text-oc-text">
                No customers found
              </p>
              <p className="mt-2 text-sm leading-6 text-oc-muted">
                Customers appear here when conversations, widget chats, or
                supported channels create CRM records.
              </p>
            </div>
          )}
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              active={selectedId === customer.id}
              onSelect={() => setSelectedId(customer.id)}
            />
          ))}
        </div>
        {(cursorHistory.length > 0 || data?.nextCursor) && (
          <div className="flex shrink-0 items-center justify-between border-t border-oc-border p-3">
            <Button
              type="button"
              variant="secondary"
              disabled={cursorHistory.length === 0}
              onClick={() => {
                const history = [...cursorHistory];
                setCursor(history.pop() || undefined);
                setCursorHistory(history);
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!data?.nextCursor}
              onClick={() => {
                setCursorHistory((history) => [...history, cursor ?? ""]);
                setCursor(data?.nextCursor ?? undefined);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </section>

      <section
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-4 md:p-6 xl:p-8",
          !selectedId && "hidden md:block",
        )}
      >
        {!selectedId && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-xl border border-dashed border-oc-border bg-oc-panel/30 p-8 text-center">
              <UserRound className="mx-auto h-10 w-10 text-oc-faint" />
              <p className="mt-4 text-base font-semibold text-oc-text">
                Select a customer
              </p>
              <p className="mt-2 text-sm leading-6 text-oc-muted">
                Open a customer to view identity, metrics, conversations,
                tickets, and chronological support history.
              </p>
            </div>
          </div>
        )}

        {selectedId && (
          <div className="mx-auto max-w-6xl space-y-5">
            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-2 px-0 md:hidden"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to customers
            </Button>

            {dLoading && (
              <div className="space-y-4">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-72 w-full rounded-xl" />
              </div>
            )}

            {detailError && (
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5 text-sm text-red-200">
                {getErrorMessage(detailError, "Failed to load customer.")}
              </div>
            )}

            {detail && !detailError && (
              <CustomerDetailWorkspace customer={detail} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function CustomerRow({
  customer,
  active,
  onSelect,
}: {
  customer: Customer;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "mb-2 flex w-full gap-3 rounded-xl border border-oc-border/60 bg-oc-bg-mid/60 px-3 py-3 text-left transition-colors hover:bg-oc-panel/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
        active && "bg-oc-panel ring-1 ring-inset ring-violet-500/35",
      )}
    >
      <Avatar src={customer.avatarUrl} name={displayCustomerName(customer)} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-oc-text">
          {displayCustomerName(customer)}
        </p>
        <p className="mt-1 truncate text-xs text-oc-muted">
          {customer.email || customer.phone || "No contact detail"}
        </p>
        <p className="mt-1 text-xs text-oc-faint">
          Created {customer.createdAt ? formatRelative(customer.createdAt) : "—"}
        </p>
      </div>
    </button>
  );
}

function CustomerDetailWorkspace({ customer }: { customer: Customer }) {
  const metrics = customer.metrics;

  return (
    <>
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar src={customer.avatarUrl} name={displayCustomerName(customer)} size={64} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-oc-faint">
                Customer 360
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-oc-text">
                {displayCustomerName(customer)}
              </h2>
              <div className="mt-3 grid gap-2 text-sm text-oc-muted sm:grid-cols-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-oc-faint" />
                  <span className="truncate">{customer.email || "No email"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-oc-faint" />
                  <span className="truncate">{customer.phone || "No phone"}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-oc-faint" />
                  Created {formatDateTime(customer.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-oc-faint" />
                  Last active {customer.lastActivityAt ? formatRelative(customer.lastActivityAt) : "—"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(customer.channelsUsed ?? []).length ? (
              customer.channelsUsed?.map((channel) => (
                <Badge key={channel} tone={channelTone(channel)} className="normal-case">
                  {channelLabel(channel)}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral" className="normal-case">
                No channels yet
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Conversations" value={metrics?.totalConversations ?? 0} />
        <MetricCard label="Tickets" value={metrics?.totalTickets ?? 0} />
        <MetricCard label="Open tickets" value={metrics?.openTickets ?? 0} />
        <MetricCard label="Closed tickets" value={metrics?.closedTickets ?? 0} />
        <MetricCard
          label="Last interaction"
          value={metrics?.lastInteractionAt ? formatRelative(metrics.lastInteractionAt) : "—"}
        />
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <h3 className="text-xs font-semibold uppercase text-oc-faint">
            Tags
          </h3>
          <p className="mt-1 text-sm text-oc-muted">
            Classify this customer for internal support workflows.
          </p>
        </div>
        <TagEditor
          targetType="customers"
          targetId={customer.id}
          selectedTags={customer.tags}
          invalidateKeys={[queryKeys.customer(customer.id), ["customers"]]}
        />
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <CustomerConversations conversations={customer.conversations ?? []} />
          <CustomerTickets tickets={customer.tickets ?? []} />
        </div>
        <CustomerTimeline items={customer.timeline ?? []} />
      </div>
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase text-oc-faint">{label}</p>
      <p className="mt-2 text-xl font-semibold text-oc-text">{value}</p>
    </Card>
  );
}

function CustomerConversations({
  conversations,
}: {
  conversations: CustomerConversationSummary[];
}) {
  return (
    <Card className="p-0">
      <SectionHeader title="Conversations" count={conversations.length} />
      <div className="divide-y divide-oc-border/50">
        {!conversations.length ? (
          <EmptySection text="No conversations linked to this customer yet." />
        ) : (
          conversations.map((conversation) => (
            <div key={conversation.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={channelTone(conversation.channel)} className="normal-case">
                    {channelLabel(conversation.channel)}
                  </Badge>
                  <Badge tone="neutral" className="normal-case">
                    {conversation.status ?? "OPEN"}
                  </Badge>
                  <span className="text-xs text-oc-faint">
                    Updated {conversation.updatedAt ? formatRelative(conversation.updatedAt) : "—"}
                  </span>
                  {Boolean(conversation.tags?.length) && (
                    <TagPills tags={conversation.tags} />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-oc-text">
                  {conversation.lastMessagePreview || "No messages yet"}
                </p>
              </div>
              <Link
                href={`/inbox?c=${conversation.id}`}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-oc-border bg-oc-elevated px-3 text-sm font-medium text-oc-text transition-colors hover:bg-oc-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent"
              >
                Open inbox
              </Link>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CustomerTickets({ tickets }: { tickets: CustomerTicketSummary[] }) {
  return (
    <Card className="p-0">
      <SectionHeader title="Tickets" count={tickets.length} />
      <div className="divide-y divide-oc-border/50">
        {!tickets.length ? (
          <EmptySection text="No tickets linked to this customer yet." />
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-oc-faint">
                    {ticket.id.slice(0, 8)}
                  </span>
                  <Badge tone={statusTone(ticket.status)} className="normal-case">
                    {ticket.status}
                  </Badge>
                  <Badge tone={priorityTone(ticket.priority)} className="normal-case">
                    {ticket.priority}
                  </Badge>
                  {Boolean(ticket.tags?.length) && (
                    <TagPills tags={ticket.tags} />
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-oc-text">
                  {ticket.subject}
                </p>
                <p className="mt-1 text-xs text-oc-muted">
                  Assigned to {displayUser(ticket.assignee)} · Created{" "}
                  {ticket.createdAt ? formatRelative(ticket.createdAt) : "—"}
                </p>
              </div>
              <Link
                href={`/tickets?ticketId=${ticket.id}`}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-oc-border bg-oc-elevated px-3 text-sm font-medium text-oc-text transition-colors hover:bg-oc-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent"
              >
                Open ticket
              </Link>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CustomerTimeline({ items }: { items: CustomerTimelineItem[] }) {
  return (
    <Card className="p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-oc-text">Customer timeline</h3>
        <p className="mt-1 text-sm text-oc-muted">
          Newest support activity first.
        </p>
      </div>
      {!items.length ? (
        <EmptySection text="No timeline activity yet." />
      ) : (
        <div className="relative space-y-0 pl-3">
          <span className="absolute bottom-4 left-[25px] top-4 w-px bg-oc-border/70" />
          {items.map((item) => (
            <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-oc-border",
                  timelineIconClass(item.type),
                )}
              >
                {item.type.includes("TICKET") ? (
                  <TicketIcon className="h-3.5 w-3.5" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1 rounded-lg border border-oc-border/60 bg-oc-bg/55 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-oc-text">
                    {item.title}
                  </p>
                  <span className="text-xs text-oc-faint">
                    {formatRelative(item.timestamp)}
                  </span>
                </div>
                {item.actor && (
                  <p className="mt-1 text-xs text-oc-faint">
                    {displayUser(item.actor)}
                  </p>
                )}
                {item.description && (
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-oc-muted">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-oc-border p-4">
      <h3 className="text-sm font-semibold text-oc-text">{title}</h3>
      <span className="rounded-full border border-oc-border bg-oc-bg px-2.5 py-1 text-xs text-oc-muted">
        {count}
      </span>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
      {text}
    </p>
  );
}
