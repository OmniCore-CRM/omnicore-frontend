"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConversations } from "@/api/conversations";
import { getErrorMessage } from "@/api/errors";
import { listTickets } from "@/api/tickets";
import { queryKeys } from "@/constants/query-keys";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { Conversation, Ticket } from "@/types/models";
import { ExternalLink } from "lucide-react";

type TicketQuickFilter = "all" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
type ConversationQuickFilter = "all" | "open" | "closed";

const ticketQuickFilters: Array<{ key: TicketQuickFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "PENDING", label: "Pending" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

const conversationQuickFilters: Array<{
  key: ConversationQuickFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
];

function statusTone(status: Ticket["status"]) {
  if (status === "RESOLVED" || status === "CLOSED") return "success" as const;
  if (status === "ESCALATED") return "danger" as const;
  if (status === "PENDING") return "warning" as const;
  return "neutral" as const;
}

function priorityTone(priority: Ticket["priority"]) {
  if (priority === "URGENT") return "danger" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "MEDIUM") return "accent" as const;
  return "neutral" as const;
}

function conversationStatusTone(status?: Conversation["status"]) {
  if (status === "RESOLVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "SNOOZED") return "accent" as const;
  return "neutral" as const;
}

function channelLabel(channel?: Conversation["channel"]) {
  if (!channel) return "Unknown";
  if (channel === "WHATSAPP") return "WhatsApp";
  return channel;
}

function customerNameFromTicket(ticket: Ticket) {
  return (
    [ticket.customer?.firstName, ticket.customer?.lastName]
      .filter(Boolean)
      .join(" ") ||
    ticket.customer?.email ||
    "Customer"
  );
}

function customerNameFromConversation(conversation: Conversation) {
  return (
    [conversation.customer?.firstName, conversation.customer?.lastName]
      .filter(Boolean)
      .join(" ") ||
    conversation.customer?.email ||
    conversation.customer?.phone ||
    "Customer"
  );
}

function conversationLastMessage(conversation: Conversation) {
  return (
    conversation.lastMessagePreview?.trim() ||
    conversation.latestMessage?.content?.trim() ||
    conversation.lastMessage?.content?.trim() ||
    "No messages yet"
  );
}

function isConversationOpen(conversation: Conversation) {
  return conversation.status !== "RESOLVED";
}

function isConversationUnread(conversation: Conversation) {
  if ((conversation.unreadCount ?? 0) > 0) return true;
  return (
    conversation.latestMessage?.sender === "CUSTOMER" &&
    conversation.status !== "RESOLVED"
  );
}

export default function MyWorkPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [ticketFilter, setTicketFilter] = useState<TicketQuickFilter>("all");
  const [conversationFilter, setConversationFilter] =
    useState<ConversationQuickFilter>("all");

  const userId = user?.id;

  const assignedTicketsQuery = useQuery({
    queryKey: queryKeys.tickets({
      assigneeId: userId ?? "",
      limit: "100",
      scope: "my-work",
    }),
    queryFn: () =>
      listTickets(token!, {
        assigneeId: userId,
        limit: 100,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const assignedConversationsQuery = useQuery({
    queryKey: queryKeys.conversations({
      assigneeId: userId ?? "",
      limit: "100",
      scope: "my-work",
    }),
    queryFn: () =>
      listConversations(token!, {
        assigneeId: userId,
        limit: 100,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const pendingTicketsCountQuery = useQuery({
    queryKey: queryKeys.tickets({
      assigneeId: userId ?? "",
      status: "PENDING",
      limit: "1",
      scope: "my-work-count",
    }),
    queryFn: () =>
      listTickets(token!, {
        assigneeId: userId,
        status: "PENDING",
        limit: 1,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const openConversationsCountQuery = useQuery({
    queryKey: queryKeys.conversations({
      assigneeId: userId ?? "",
      status: "OPEN",
      limit: "1",
      scope: "my-work-count",
    }),
    queryFn: () =>
      listConversations(token!, {
        assigneeId: userId,
        status: "OPEN",
        limit: 1,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const pendingConversationsCountQuery = useQuery({
    queryKey: queryKeys.conversations({
      assigneeId: userId ?? "",
      status: "PENDING",
      limit: "1",
      scope: "my-work-count",
    }),
    queryFn: () =>
      listConversations(token!, {
        assigneeId: userId,
        status: "PENDING",
        limit: 1,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const snoozedConversationsCountQuery = useQuery({
    queryKey: queryKeys.conversations({
      assigneeId: userId ?? "",
      status: "SNOOZED",
      limit: "1",
      scope: "my-work-count",
    }),
    queryFn: () =>
      listConversations(token!, {
        assigneeId: userId,
        status: "SNOOZED",
        limit: 1,
      }),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("ticket_created", refresh);
    socket.on("ticket_updated", refresh);
    socket.on("ticket_note_added", refresh);
    socket.on("conversation:updated", refresh);
    socket.on("new_message", refresh);
    socket.on("message_status_updated", refresh);

    return () => {
      socket.off("ticket_created", refresh);
      socket.off("ticket_updated", refresh);
      socket.off("ticket_note_added", refresh);
      socket.off("conversation:updated", refresh);
      socket.off("new_message", refresh);
      socket.off("message_status_updated", refresh);
    };
  }, [queryClient, socket]);

  const assignedTickets = useMemo(
    () => assignedTicketsQuery.data?.items ?? [],
    [assignedTicketsQuery.data?.items],
  );
  const assignedConversations = useMemo(
    () => assignedConversationsQuery.data?.items ?? [],
    [assignedConversationsQuery.data?.items],
  );

  const filteredTickets = useMemo(() => {
    if (ticketFilter === "all") return assignedTickets;
    return assignedTickets.filter((ticket) => ticket.status === ticketFilter);
  }, [assignedTickets, ticketFilter]);

  const filteredConversations = useMemo(() => {
    if (conversationFilter === "all") return assignedConversations;
    if (conversationFilter === "open") {
      return assignedConversations.filter((conversation) =>
        isConversationOpen(conversation),
      );
    }

    return assignedConversations.filter(
      (conversation) => !isConversationOpen(conversation),
    );
  }, [assignedConversations, conversationFilter]);

  const unreadConversations = useMemo(
    () => assignedConversations.filter((conversation) => isConversationUnread(conversation)),
    [assignedConversations],
  );

  const ticketSummary = assignedTicketsQuery.data?.summary;
  const assignedTicketsCount =
    assignedTicketsQuery.data?.total ?? assignedTickets.length;
  const assignedConversationsCount =
    assignedConversationsQuery.data?.total ?? assignedConversations.length;
  const openConversationsCount = openConversationsCountQuery.data?.total ?? 0;
  const pendingConversationsCount =
    pendingConversationsCountQuery.data?.total ?? 0;
  const snoozedConversationsCount =
    snoozedConversationsCountQuery.data?.total ?? 0;
  const pendingTicketsCount = pendingTicketsCountQuery.data?.total ?? 0;

  const openWorkCount =
    (ticketSummary?.openPending ?? 0) +
    (ticketSummary?.escalated ?? 0) +
    openConversationsCount +
    pendingConversationsCount +
    snoozedConversationsCount;

  const pendingWorkCount = pendingTicketsCount + pendingConversationsCount;

  const isSummaryLoading =
    assignedTicketsQuery.isLoading ||
    assignedConversationsQuery.isLoading ||
    pendingTicketsCountQuery.isLoading ||
    openConversationsCountQuery.isLoading ||
    pendingConversationsCountQuery.isLoading ||
    snoozedConversationsCountQuery.isLoading;

  const summaryError =
    assignedTicketsQuery.error ||
    assignedConversationsQuery.error ||
    pendingTicketsCountQuery.error ||
    openConversationsCountQuery.error ||
    pendingConversationsCountQuery.error ||
    snoozedConversationsCountQuery.error;

  return (
    <div className="h-full overflow-y-auto p-3 md:p-4">
      <div className="mx-auto max-w-[92rem] space-y-4">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-normal text-oc-text">
            My Work Dashboard
          </h1>
          <p className="max-w-3xl text-sm text-oc-muted">
            Focused queue for your assigned tickets and conversations.
          </p>
        </header>

        {summaryError && (
          <Card className="border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(summaryError, "Could not load your work summary.")}
          </Card>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Assigned Tickets"
            value={assignedTicketsCount}
            loading={isSummaryLoading}
          />
          <SummaryCard
            label="Assigned Conversations"
            value={assignedConversationsCount}
            loading={isSummaryLoading}
          />
          <SummaryCard
            label="Open Work"
            value={openWorkCount}
            loading={isSummaryLoading}
          />
          <SummaryCard
            label="Pending Work"
            value={pendingWorkCount}
            loading={isSummaryLoading}
          />
        </div>

        <Card className="p-4 md:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase text-oc-faint">
              Unread Work
            </h2>
            <p className="mt-1 text-sm text-oc-muted">
              Conversations assigned to you that still need attention.
            </p>
          </div>

          {assignedConversationsQuery.isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : assignedConversationsQuery.error ? (
            <p className="text-sm text-red-200">
              {getErrorMessage(
                assignedConversationsQuery.error,
                "Could not load unread work.",
              )}
            </p>
          ) : unreadConversations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
              No unread assigned conversations.
            </p>
          ) : (
            <div className="space-y-2.5">
              {unreadConversations.slice(0, 8).map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex flex-col gap-2 rounded-lg border border-oc-border/70 bg-oc-bg/45 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-oc-text">
                      {customerNameFromConversation(conversation)}
                    </p>
                    <p className="mt-1 truncate text-xs text-oc-muted">
                      {conversationLastMessage(conversation)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning" className="normal-case">
                      {(conversation.unreadCount ?? 0) > 0
                        ? `${conversation.unreadCount} unread`
                        : "Needs reply"}
                    </Badge>
                    <Link href={`/inbox?c=${conversation.id}`}>
                      <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5">
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-oc-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">
                Assigned Tickets
              </h2>
              <div className="flex flex-wrap gap-1.5" aria-label="Ticket quick filters">
                {ticketQuickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setTicketFilter(filter.key)}
                    className={cn(
                      "h-7 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
                      ticketFilter === filter.key
                        ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/35"
                        : "text-oc-muted hover:bg-oc-panel hover:text-oc-text",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/60 text-xs uppercase text-oc-faint">
                <tr>
                  <th className="w-[24%] px-4 py-3 font-semibold">Subject</th>
                  <th className="w-[13%] px-4 py-3 font-semibold">Customer</th>
                  <th className="w-[12%] px-4 py-3 font-semibold">Status</th>
                  <th className="w-[11%] px-4 py-3 font-semibold">Priority</th>
                  <th className="w-[12%] px-4 py-3 font-semibold">SLA</th>
                  <th className="w-[12%] px-4 py-3 font-semibold">Team</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Updated</th>
                  <th className="w-[6%] px-4 py-3 font-semibold text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {assignedTicketsQuery.isLoading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-oc-border/45">
                      <td className="px-4 py-3" colSpan={8}>
                        <Skeleton className="h-9 w-full" />
                      </td>
                    </tr>
                  ))}
                {assignedTicketsQuery.error && (
                  <tr>
                    <td className="px-4 py-6 text-red-200" colSpan={8}>
                      {getErrorMessage(
                        assignedTicketsQuery.error,
                        "Could not load assigned tickets.",
                      )}
                    </td>
                  </tr>
                )}
                {!assignedTicketsQuery.isLoading &&
                  !assignedTicketsQuery.error &&
                  filteredTickets.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={8}>
                        <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-center text-sm text-oc-muted">
                          No assigned tickets.
                        </p>
                      </td>
                    </tr>
                  )}
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-oc-border/45 hover:bg-oc-panel/35">
                    <td className="px-4 py-3.5">
                      <p className="truncate font-medium text-oc-text">{ticket.subject}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {customerNameFromTicket(ticket)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={statusTone(ticket.status)} className="normal-case">
                        {ticket.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={priorityTone(ticket.priority)} className="normal-case">
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {ticket.slaStatus.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {ticket.team?.name || "No team"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/tickets?ticketId=${ticket.id}`}>
                        <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5">
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 p-3 lg:hidden">
            {assignedTicketsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-lg" />
              ))}
            {assignedTicketsQuery.error && (
              <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                {getErrorMessage(
                  assignedTicketsQuery.error,
                  "Could not load assigned tickets.",
                )}
              </p>
            )}
            {!assignedTicketsQuery.isLoading &&
              !assignedTicketsQuery.error &&
              filteredTickets.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No assigned tickets.
                </p>
              )}
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="space-y-2.5 p-3.5">
                <p className="line-clamp-2 text-sm font-semibold text-oc-text">
                  {ticket.subject}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                  <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
                  <Badge tone="neutral">SLA {ticket.slaStatus.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-oc-muted">{customerNameFromTicket(ticket)}</p>
                <p className="text-xs text-oc-muted">
                  Team: {ticket.team?.name || "No team"} · {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "-"}
                </p>
                <Link href={`/tickets?ticketId=${ticket.id}`}>
                  <Button type="button" size="sm" variant="secondary" className="mt-1 h-8 w-full gap-1.5">
                    Open ticket
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-oc-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">
                Assigned Conversations
              </h2>
              <div className="flex flex-wrap gap-1.5" aria-label="Conversation quick filters">
                {conversationQuickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setConversationFilter(filter.key)}
                    className={cn(
                      "h-7 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
                      conversationFilter === filter.key
                        ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/35"
                        : "text-oc-muted hover:bg-oc-panel hover:text-oc-text",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/60 text-xs uppercase text-oc-faint">
                <tr>
                  <th className="w-[17%] px-4 py-3 font-semibold">Customer</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Channel</th>
                  <th className="w-[12%] px-4 py-3 font-semibold">Team</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Status</th>
                  <th className="w-[34%] px-4 py-3 font-semibold">Last message</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Updated</th>
                  <th className="w-[7%] px-4 py-3 font-semibold text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {assignedConversationsQuery.isLoading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-oc-border/45">
                      <td className="px-4 py-3" colSpan={7}>
                        <Skeleton className="h-9 w-full" />
                      </td>
                    </tr>
                  ))}
                {assignedConversationsQuery.error && (
                  <tr>
                    <td className="px-4 py-6 text-red-200" colSpan={7}>
                      {getErrorMessage(
                        assignedConversationsQuery.error,
                        "Could not load assigned conversations.",
                      )}
                    </td>
                  </tr>
                )}
                {!assignedConversationsQuery.isLoading &&
                  !assignedConversationsQuery.error &&
                  filteredConversations.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={7}>
                        <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-center text-sm text-oc-muted">
                          No assigned conversations.
                        </p>
                      </td>
                    </tr>
                  )}
                {filteredConversations.map((conversation) => (
                  <tr key={conversation.id} className="border-b border-oc-border/45 hover:bg-oc-panel/35">
                    <td className="px-4 py-3.5 text-sm text-oc-text">
                      {customerNameFromConversation(conversation)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {channelLabel(conversation.channel)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {conversation.team?.name || "No team"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={conversationStatusTone(conversation.status)}>
                        {conversation.status || "OPEN"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      <span className="line-clamp-2">{conversationLastMessage(conversation)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-oc-muted">
                      {conversation.updatedAt ? formatRelative(conversation.updatedAt) : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/inbox?c=${conversation.id}`}>
                        <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5">
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 p-3 lg:hidden">
            {assignedConversationsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-lg" />
              ))}
            {assignedConversationsQuery.error && (
              <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                {getErrorMessage(
                  assignedConversationsQuery.error,
                  "Could not load assigned conversations.",
                )}
              </p>
            )}
            {!assignedConversationsQuery.isLoading &&
              !assignedConversationsQuery.error &&
              filteredConversations.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No assigned conversations.
                </p>
              )}
            {filteredConversations.map((conversation) => (
              <Card key={conversation.id} className="space-y-2.5 p-3.5">
                <p className="truncate text-sm font-semibold text-oc-text">
                  {customerNameFromConversation(conversation)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{channelLabel(conversation.channel)}</Badge>
                  <Badge tone={conversationStatusTone(conversation.status)}>
                    {conversation.status || "OPEN"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-oc-muted">
                  {conversationLastMessage(conversation)}
                </p>
                <p className="text-xs text-oc-muted">
                  Team: {conversation.team?.name || "No team"} · {conversation.updatedAt ? formatRelative(conversation.updatedAt) : "-"}
                </p>
                <Link href={`/inbox?c=${conversation.id}`}>
                  <Button type="button" size="sm" variant="secondary" className="mt-1 h-8 w-full gap-1.5">
                    Open conversation
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="p-3.5">
      <p className="text-xs font-semibold uppercase text-oc-faint">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-oc-text">
        {loading ? "..." : value}
      </p>
    </Card>
  );
}
