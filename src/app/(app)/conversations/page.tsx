"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listConversations } from "@/api/conversations";
import { listUsers } from "@/api/users";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import type {
  AuthUser,
  Conversation,
  TicketPriority,
  TicketStatus,
} from "@/types/models";

const ticketStatuses: TicketStatus[] = [
  "OPEN",
  "PENDING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const ticketPriorities: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const controlClass =
  "mt-2 h-11 w-full min-w-0 rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent";

const displayCustomer = (conversation: Conversation) => {
  const customer = conversation.customer;
  if (!customer) return "Customer";
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email ||
    customer.phone ||
    "Customer"
  );
};

const displayUser = (user?: AuthUser | null) =>
  user?.displayName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "Unassigned";

function statusTone(status?: TicketStatus) {
  if (status === "RESOLVED" || status === "CLOSED") return "success" as const;
  if (status === "ESCALATED") return "danger" as const;
  if (status === "PENDING") return "warning" as const;
  return "neutral" as const;
}

function priorityTone(priority?: TicketPriority) {
  if (priority === "URGENT") return "danger" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "MEDIUM") return "accent" as const;
  return "neutral" as const;
}

export default function ConversationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [search, setSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | "">("");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority | "">("");
  const [assigneeId, setAssigneeId] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const debouncedSearch = useDebouncedValue(search);

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      ticketStatus: ticketStatus || undefined,
      ticketPriority: ticketPriority || undefined,
      assigneeId: assigneeId || undefined,
      cursor,
      limit: 30,
    }),
    [assigneeId, cursor, debouncedSearch, ticketPriority, ticketStatus],
  );

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations({
      search: params.search,
      ticketStatus: params.ticketStatus,
      ticketPriority: params.ticketPriority,
      assigneeId: params.assigneeId,
      cursor: params.cursor,
      limit: String(params.limit),
    }),
    queryFn: () => listConversations(token!, params),
    enabled: !!token,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  const conversations = conversationsQuery.data?.items ?? [];
  const filtered = Boolean(
    search.trim() || ticketStatus || ticketPriority || assigneeId,
  );
  const resetPagination = () => setCursor(undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-oc-text">
              Conversations
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-oc-muted">
              Review customer conversations with linked ticket ownership,
              priority, and status context.
            </p>
          </div>
          <Link href="/inbox" className="inline-flex">
            <Button type="button" variant="secondary">
              Open inbox
            </Button>
          </Link>
        </header>

        <Card className="p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint md:col-span-2">
              Search customer
              <span className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oc-faint" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPagination();
                  }}
                  placeholder="Name, email, phone, or customer ID..."
                  className="pl-10"
                  aria-label="Search conversations by customer"
                />
              </span>
            </label>

            <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
              Ticket status
              <select
                value={ticketStatus}
                onChange={(event) => {
                  setTicketStatus(event.target.value as TicketStatus | "");
                  resetPagination();
                }}
                className={controlClass}
                aria-label="Filter by ticket status"
              >
                <option value="">All statuses</option>
                {ticketStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
              Ticket priority
              <select
                value={ticketPriority}
                onChange={(event) => {
                  setTicketPriority(event.target.value as TicketPriority | "");
                  resetPagination();
                }}
                className={controlClass}
                aria-label="Filter by ticket priority"
              >
                <option value="">All priorities</option>
                {ticketPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
              Assignee
              <select
                value={assigneeId}
                onChange={(event) => {
                  setAssigneeId(event.target.value);
                  resetPagination();
                }}
                className={controlClass}
                aria-label="Filter by ticket assignee"
              >
                <option value="">All assignees</option>
                {(usersQuery.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {displayUser(user)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <Card className="hidden overflow-hidden p-0 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oc-border bg-oc-bg/60 text-[11px] uppercase tracking-wide text-oc-faint">
              <tr>
                <th className="px-5 py-4 font-medium">Customer</th>
                <th className="px-5 py-4 font-medium">Channel</th>
                <th className="px-5 py-4 font-medium">Ticket</th>
                <th className="px-5 py-4 font-medium">Priority</th>
                <th className="px-5 py-4 font-medium">Assignee</th>
                <th className="px-5 py-4 font-medium">Updated</th>
                <th className="px-5 py-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {conversationsQuery.isLoading &&
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-oc-border/60">
                    <td className="px-5 py-4" colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))}

              {conversationsQuery.error && (
                <tr>
                  <td className="px-5 py-8 text-oc-danger" colSpan={7}>
                    {getErrorMessage(
                      conversationsQuery.error,
                      "Failed to load conversations.",
                    )}
                  </td>
                </tr>
              )}

              {!conversationsQuery.isLoading &&
                !conversationsQuery.error &&
                conversations.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-oc-muted" colSpan={7}>
                      {filtered
                        ? "No conversations match these filters."
                        : "No conversations yet."}
                    </td>
                  </tr>
                )}

              {conversations.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} />
              ))}
            </tbody>
          </table>
        </Card>

        <div className="grid gap-3 lg:hidden">
          {conversationsQuery.isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="p-4">
                <Skeleton className="h-24 w-full" />
              </Card>
            ))}

          {conversationsQuery.error && (
            <Card className="border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
              {getErrorMessage(conversationsQuery.error, "Failed to load conversations.")}
            </Card>
          )}

          {!conversationsQuery.isLoading &&
            !conversationsQuery.error &&
            conversations.length === 0 && (
              <Card className="p-6 text-center text-sm text-oc-muted">
                {filtered
                  ? "No conversations match these filters."
                  : "No conversations yet."}
              </Card>
            )}

          {conversations.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-oc-faint">
            Showing {conversations.length} conversations
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={!conversationsQuery.data?.nextCursor || conversationsQuery.isFetching}
            onClick={() =>
              setCursor(conversationsQuery.data?.nextCursor ?? undefined)
            }
          >
            {conversationsQuery.isFetching ? "Loading..." : "Next page"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const ticket = conversation.primaryTicket;
  return (
    <tr className="border-b border-oc-border/40 hover:bg-oc-panel/40">
      <td className="px-5 py-4">
        <div className="min-w-0">
          <p className="font-medium text-oc-text">{displayCustomer(conversation)}</p>
          <p className="mt-1 truncate text-xs text-oc-faint">
            ID {conversation.customer?.id ?? conversation.customerId}
          </p>
          <p className="mt-1 truncate text-xs text-oc-muted">
            {[conversation.customer?.email, conversation.customer?.phone]
              .filter(Boolean)
              .join(" · ") || "No contact detail"}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <Badge tone="neutral" className="normal-case">
          {conversation.channel}
        </Badge>
      </td>
      <td className="px-5 py-4">
        {ticket ? (
          <div className="min-w-0">
            <Badge tone={statusTone(ticket.status)} className="normal-case">
              {ticket.status}
            </Badge>
            <p className="mt-2 max-w-52 truncate text-xs text-oc-muted">
              {ticket.subject}
            </p>
          </div>
        ) : (
          <span className="text-sm text-oc-faint">No ticket</span>
        )}
      </td>
      <td className="px-5 py-4">
        {ticket ? (
          <Badge tone={priorityTone(ticket.priority)} className="normal-case">
            {ticket.priority}
          </Badge>
        ) : (
          <span className="text-sm text-oc-faint">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-oc-muted">
        {displayUser(ticket?.assignee)}
      </td>
      <td className="px-5 py-4 text-xs text-oc-faint">
        {conversation.updatedAt ? formatRelative(conversation.updatedAt) : "—"}
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          href={`/inbox?c=${encodeURIComponent(conversation.id)}`}
          className="text-xs font-medium text-oc-accent-2 hover:underline"
        >
          Open
        </Link>
      </td>
    </tr>
  );
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const ticket = conversation.primaryTicket;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-oc-text">
            {displayCustomer(conversation)}
          </p>
          <p className="mt-1 truncate text-xs text-oc-faint">
            ID {conversation.customer?.id ?? conversation.customerId}
          </p>
        </div>
        <Badge tone="neutral" className="normal-case">
          {conversation.channel}
        </Badge>
      </div>

      <p className="text-sm text-oc-muted">
        {[conversation.customer?.email, conversation.customer?.phone]
          .filter(Boolean)
          .join(" · ") || "No contact detail"}
      </p>

      <div className="flex flex-wrap gap-2">
        {ticket ? (
          <>
            <Badge tone={statusTone(ticket.status)} className="normal-case">
              {ticket.status}
            </Badge>
            <Badge tone={priorityTone(ticket.priority)} className="normal-case">
              {ticket.priority}
            </Badge>
          </>
        ) : (
          <Badge tone="neutral" className="normal-case">
            No ticket
          </Badge>
        )}
      </div>

      <div className="grid gap-1 text-sm text-oc-muted">
        <span>Assignee: {displayUser(ticket?.assignee)}</span>
        <span>
          Updated {conversation.updatedAt ? formatRelative(conversation.updatedAt) : "—"}
        </span>
      </div>

      <Link
        href={`/inbox?c=${encodeURIComponent(conversation.id)}`}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-oc-border px-3 text-sm font-medium text-oc-accent-2 hover:bg-oc-panel"
      >
        Open conversation
      </Link>
    </Card>
  );
}
