"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAssignmentCenterOverview } from "@/api/assignment-center";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { SOCKET_EVENTS } from "@/constants/socket-events";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import type {
  AssignmentCenterConversationItem,
  AssignmentCenterRecentAssignmentItem,
  AssignmentCenterTicketItem,
} from "@/types/models";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Clock3,
  ExternalLink,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react";

function customerLabel(item: {
  customer?: {
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}) {
  const customer = item.customer;
  if (!customer) return "Customer";
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  return full || customer.email || customer.phone || "Customer";
}

function conversationStatusTone(status: AssignmentCenterConversationItem["status"]) {
  if (status === "PENDING") return "warning" as const;
  if (status === "SNOOZED") return "accent" as const;
  if (status === "RESOLVED") return "success" as const;
  return "neutral" as const;
}

function ticketStatusTone(status: AssignmentCenterTicketItem["status"]) {
  if (status === "ESCALATED") return "danger" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "RESOLVED" || status === "CLOSED") return "success" as const;
  return "neutral" as const;
}

function ticketPriorityTone(priority: AssignmentCenterTicketItem["priority"]) {
  if (priority === "URGENT") return "danger" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "MEDIUM") return "accent" as const;
  return "neutral" as const;
}

function channelLabel(channel: AssignmentCenterConversationItem["channel"]) {
  if (channel === "WHATSAPP") return "WhatsApp";
  return channel;
}

function ActionLinkButton({
  href,
  id,
  label,
  pendingActionId,
  setPendingActionId,
}: {
  href: string;
  id: string;
  label: string;
  pendingActionId: string | null;
  setPendingActionId: (id: string) => void;
}) {
  const isPending = pendingActionId === id;

  return (
    <Link href={href} onClick={() => setPendingActionId(id)}>
      <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5">
        {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
        {isPending ? "Opening..." : label}
      </Button>
    </Link>
  );
}

export default function AssignmentCenterPage() {
  const token = useAuthStore((state) => state.accessToken);
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: queryKeys.assignmentCenter({ scope: "overview" }),
    queryFn: () => getAssignmentCenterOverview(token!, { listLimit: 8, recentLimit: 8 }),
    enabled: Boolean(token),
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["assignment-center"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    };

    socket.on("ticket_created", refresh);
    socket.on("ticket_updated", refresh);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, refresh);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, refresh);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, refresh);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, refresh);
    socket.on(SOCKET_EVENTS.NOTIFICATION_UPDATED, refresh);
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ_ALL, refresh);

    return () => {
      socket.off("ticket_created", refresh);
      socket.off("ticket_updated", refresh);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, refresh);
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, refresh);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, refresh);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, refresh);
      socket.off(SOCKET_EVENTS.NOTIFICATION_UPDATED, refresh);
      socket.off(SOCKET_EVENTS.NOTIFICATION_READ_ALL, refresh);
    };
  }, [queryClient, socket]);

  const counters = overviewQuery.data?.counters;
  const myTickets = overviewQuery.data?.myTickets ?? [];
  const myConversations = overviewQuery.data?.myConversations ?? [];
  const recentAssignments = overviewQuery.data?.recentAssignments ?? [];
  const teamWorkload = overviewQuery.data?.teamWorkload ?? [];
  const canViewTeamWorkload = overviewQuery.data?.scope.canViewTeamWorkload ?? false;

  const summaryCards = useMemo(
    () => [
      {
        key: "myAssignedOpenTickets",
        label: "My assigned open tickets",
        value: counters?.myAssignedOpenTickets ?? 0,
        icon: Ticket,
      },
      {
        key: "myAssignedConversations",
        label: "My assigned conversations",
        value: counters?.myAssignedConversations ?? 0,
        icon: MessageSquare,
      },
      {
        key: "unreadAssignedWork",
        label: "Unread assigned work",
        value: counters?.unreadAssignedWork ?? 0,
        icon: Bell,
      },
      {
        key: "pendingAssignedWork",
        label: "Pending assigned work",
        value: counters?.pendingAssignedWork ?? 0,
        icon: Clock3,
      },
      {
        key: "slaRisks",
        label: "SLA at risk / breached",
        value: (counters?.slaAtRisk ?? 0) + (counters?.slaBreached ?? 0),
        icon: AlertTriangle,
      },
      {
        key: "recentlyAssigned",
        label: "Recently assigned",
        value: counters?.recentlyAssigned ?? 0,
        icon: ListChecks,
      },
    ],
    [counters],
  );

  return (
    <section className="h-full min-h-0 overflow-y-auto p-3 md:p-4">
      <div className="mx-auto max-w-[92rem] space-y-4">
        <header className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-normal text-oc-text">Assignment Center</h1>
          <p className="max-w-3xl text-sm text-oc-muted">
            Dedicated assignment workspace for owned workload, SLA risks, escalations, and recent assignment activity.
          </p>
        </header>

        {overviewQuery.error && (
          <Card className="border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(overviewQuery.error, "Could not load assignment center.")}
          </Card>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map(({ key, label, value, icon: Icon }) => (
            <Card key={key} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-oc-faint">{label}</p>
                <Icon className="h-4 w-4 text-oc-faint" />
              </div>
              <p className="mt-2 text-xl font-semibold text-oc-text">
                {overviewQuery.isLoading ? "..." : value}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-oc-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">Assigned Tickets</h2>
              <Badge tone="neutral" className="normal-case">Owned queue</Badge>
            </div>

            <div className="space-y-2.5 p-3">
              {overviewQuery.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-lg" />
                ))}

              {!overviewQuery.isLoading && myTickets.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No assigned open tickets.
                </p>
              )}

              {myTickets.map((ticket) => (
                <Card key={ticket.id} className="space-y-2.5 p-3.5">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-oc-text">{ticket.subject}</p>
                    <Badge tone={ticketPriorityTone(ticket.priority)} className="shrink-0">
                      {ticket.priority}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone={ticketStatusTone(ticket.status)}>{ticket.status}</Badge>
                    <Badge tone="neutral">SLA {ticket.slaStatus.replace("_", " ")}</Badge>
                    {ticket.team?.name ? <Badge tone="neutral">{ticket.team.name}</Badge> : null}
                  </div>

                  <p className="text-xs text-oc-muted">
                    {customerLabel(ticket)} · {formatRelative(ticket.updatedAt)}
                  </p>

                  <ActionLinkButton
                    href={ticket.openRoute}
                    id={`ticket:${ticket.id}`}
                    label="Open ticket"
                    pendingActionId={pendingActionId}
                    setPendingActionId={setPendingActionId}
                  />
                </Card>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-oc-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">Assigned Conversations</h2>
              <Badge tone="neutral" className="normal-case">Owned queue</Badge>
            </div>

            <div className="space-y-2.5 p-3">
              {overviewQuery.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-lg" />
                ))}

              {!overviewQuery.isLoading && myConversations.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No assigned conversations.
                </p>
              )}

              {myConversations.map((conversation) => (
                <Card key={conversation.id} className="space-y-2.5 p-3.5">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-oc-text">
                      {customerLabel(conversation)}
                    </p>
                    <Badge tone="neutral" className="shrink-0">{channelLabel(conversation.channel)}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone={conversationStatusTone(conversation.status)}>{conversation.status}</Badge>
                    {conversation.team?.name ? <Badge tone="neutral">{conversation.team.name}</Badge> : null}
                  </div>

                  <p className="line-clamp-2 text-xs text-oc-muted">
                    {conversation.latestMessage?.content?.trim() || "No messages yet"}
                  </p>

                  <p className="text-xs text-oc-muted">Updated {formatRelative(conversation.updatedAt)}</p>

                  <ActionLinkButton
                    href={conversation.openRoute}
                    id={`conversation:${conversation.id}`}
                    label="Open conversation"
                    pendingActionId={pendingActionId}
                    setPendingActionId={setPendingActionId}
                  />
                </Card>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 2xl:grid-cols-[1.2fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-oc-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">Recently Assigned</h2>
              <Badge tone="neutral" className="normal-case">Activity</Badge>
            </div>

            <div className="space-y-2.5 p-3">
              {overviewQuery.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-lg" />
                ))}

              {!overviewQuery.isLoading && recentAssignments.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No recent assignment activity.
                </p>
              )}

              {recentAssignments.map((item: AssignmentCenterRecentAssignmentItem) => (
                <Card
                  key={item.id}
                  className={cn(
                    "space-y-2.5 p-3.5",
                    !item.isRead && "border-violet-500/30 bg-violet-900/10",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={!item.isRead ? "accent" : "neutral"}>
                      {!item.isRead ? "Unread" : "Read"}
                    </Badge>
                    <span className="text-xs text-oc-muted">{formatRelative(item.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-oc-text">{item.title}</p>
                  <p className="text-xs text-oc-muted">{item.message}</p>
                  {item.openRoute ? (
                    <ActionLinkButton
                      href={item.openRoute}
                      id={`notification:${item.id}`}
                      label="Open related item"
                      pendingActionId={pendingActionId}
                      setPendingActionId={setPendingActionId}
                    />
                  ) : (
                    <Button type="button" size="sm" variant="ghost" disabled>
                      No direct action
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-oc-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-oc-faint">Team Workload</h2>
              <Badge tone={canViewTeamWorkload ? "accent" : "neutral"} className="normal-case">
                {canViewTeamWorkload ? "Permitted" : "Restricted"}
              </Badge>
            </div>

            <div className="space-y-2.5 p-3">
              {overviewQuery.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-lg" />
                ))}

              {!overviewQuery.isLoading && !canViewTeamWorkload && (
                <div className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Team-wide workload is hidden for your role.
                  </div>
                </div>
              )}

              {!overviewQuery.isLoading && canViewTeamWorkload && teamWorkload.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                  No active team workload found.
                </p>
              )}

              {canViewTeamWorkload &&
                teamWorkload.map((row) => (
                  <Card key={row.user.id} className="space-y-2 p-3.5">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-oc-text">{row.user.displayName}</p>
                        <p className="truncate text-xs text-oc-muted">{row.user.email}</p>
                      </div>
                      <Badge tone="neutral">{roleLabel(row.user.role)}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {row.user.teams.length > 0 ? (
                        row.user.teams.slice(0, 3).map((team) => (
                          <Badge key={team.id} tone="neutral" className="normal-case">
                            <UsersRound className="h-3 w-3" />
                            {team.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge tone="neutral" className="normal-case">
                          <UserRound className="h-3 w-3" />
                          No team
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs text-oc-muted">
                      <MetricChip label="Tickets" value={row.counts.assignedOpenTickets} />
                      <MetricChip label="Conversations" value={row.counts.assignedConversations} />
                      <MetricChip label="Pending" value={row.counts.pendingAssignedWork} />
                      <MetricChip label="Unread" value={row.counts.unreadAssignedWork} />
                      <MetricChip label="Escalations" value={row.counts.escalations} />
                      <MetricChip
                        label="SLA risk/breach"
                        value={row.counts.slaAtRisk + row.counts.slaBreached}
                      />
                    </div>
                  </Card>
                ))}
            </div>
          </Card>
        </div>

        {!overviewQuery.isLoading && (
          <Card className="border-oc-border/70 bg-oc-bg-mid/50 p-3 text-xs text-oc-faint">
            <div className="flex flex-wrap items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Assigned workload is separated from urgency: ownership appears in queues, while priority and SLA are shown as independent signals.
            </div>
          </Card>
        )}

        {overviewQuery.isLoading && (
          <Card className="p-3.5 text-xs text-oc-faint">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading assignment center data...
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-oc-border/70 bg-oc-bg/45 px-2.5 py-1.5">
      <span className="text-oc-faint">{label}: </span>
      <span className="font-semibold text-oc-text">{value}</span>
    </div>
  );
}
