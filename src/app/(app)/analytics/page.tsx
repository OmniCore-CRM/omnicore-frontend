"use client";

import { useState, type ComponentType } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Inbox,
  MessagesSquare,
  Paperclip,
  RefreshCw,
  Ticket,
  Users,
  UsersRound,
} from "lucide-react";
import { getAnalyticsOverview } from "@/api/analytics";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AnalyticsBreakdownItem,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsRecentActivity,
  AnalyticsTeamItem,
} from "@/types/models";

const ranges: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const barTones: Record<string, string> = {
  WEBSITE: "bg-sky-400",
  WHATSAPP: "bg-emerald-400",
  EMAIL: "bg-amber-400",
  INSTAGRAM: "bg-pink-400",
  OPEN: "bg-sky-400",
  PENDING: "bg-amber-400",
  ESCALATED: "bg-red-400",
  RESOLVED: "bg-emerald-400",
  CLOSED: "bg-slate-400",
  SNOOZED: "bg-violet-400",
  LOW: "bg-slate-400",
  MEDIUM: "bg-sky-400",
  HIGH: "bg-amber-400",
  URGENT: "bg-red-400",
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatNumber = (value: number) => value.toLocaleString();

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-oc-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-oc-text">
            {formatNumber(value)}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-950/35 text-oc-accent-2">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-oc-faint">{hint}</p>
    </Card>
  );
}

function BreakdownPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: AnalyticsBreakdownItem[];
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-oc-text">{title}</h2>
        <p className="mt-1 text-sm text-oc-muted">{description}</p>
      </div>

      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-oc-text">
                  {formatLabel(item.key)}
                </span>
                <span className="shrink-0 text-oc-muted">
                  {formatNumber(item.count)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-oc-elevated">
                <div
                  className={`h-full rounded-full ${barTones[item.key] ?? "bg-violet-400"}`}
                  style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PanelEmpty message="No activity in this time range." />
      )}
    </Card>
  );
}

function TeamWorkload({
  tickets,
  conversations,
}: {
  tickets: AnalyticsTeamItem[];
  conversations: AnalyticsTeamItem[];
}) {
  const teamNames = Array.from(
    new Set([...tickets.map((item) => item.name), ...conversations.map((item) => item.name)]),
  );
  const rows = teamNames
    .map((name) => ({
      name,
      tickets: tickets.find((item) => item.name === name)?.count ?? 0,
      conversations:
        conversations.find((item) => item.name === name)?.count ?? 0,
    }))
    .sort(
      (a, b) =>
        b.tickets + b.conversations - (a.tickets + a.conversations) ||
        a.name.localeCompare(b.name),
    );
  const max = Math.max(
    ...rows.map((row) => row.tickets + row.conversations),
    1,
  );

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-oc-text">Team workload</h2>
        <p className="mt-1 text-sm text-oc-muted">
          Tickets and conversations created in the selected period.
        </p>
      </div>

      {rows.length ? (
        <div className="mt-5 space-y-4">
          {rows.map((row) => {
            return (
              <div key={row.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-oc-text">
                    {row.name}
                  </span>
                  <span className="shrink-0 text-xs text-oc-muted">
                    {row.tickets} tickets · {row.conversations} conversations
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-oc-elevated">
                  {row.tickets > 0 && (
                    <div
                      className="h-full bg-violet-400"
                      style={{ width: `${(row.tickets / max) * 100}%` }}
                    />
                  )}
                  {row.conversations > 0 && (
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${(row.conversations / max) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-4 border-t border-oc-border pt-3 text-xs text-oc-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              Tickets
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Conversations
            </span>
          </div>
        </div>
      ) : (
        <PanelEmpty message="No team workload in this time range." />
      )}
    </Card>
  );
}

function RecentActivityPanel({
  activities,
}: {
  activities: AnalyticsRecentActivity[];
}) {
  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-oc-text">
          Recent activity
        </h2>
        <p className="mt-1 text-sm text-oc-muted">
          Latest important support and workspace actions.
        </p>
      </div>

      {activities.length ? (
        <div className="mt-4 divide-y divide-oc-border">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex min-w-0 items-start gap-3 py-3 first:pt-1"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-oc-elevated text-oc-accent-2">
                <Activity className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-oc-text">
                  {formatLabel(activity.action)}
                </p>
                <p className="mt-0.5 truncate text-xs text-oc-muted">
                  {activity.actor?.displayName || "System"} ·{" "}
                  {formatLabel(activity.entityType)}
                </p>
              </div>
              <time className="shrink-0 text-xs text-oc-faint">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <PanelEmpty message="No recent activity in this time range." />
      )}
    </Card>
  );
}

function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="mt-5 flex min-h-32 items-center justify-center rounded-lg border border-dashed border-oc-border bg-oc-bg-mid/40 px-4 text-center text-sm text-oc-muted">
      {message}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function Dashboard({ data }: { data: AnalyticsOverview }) {
  const summaryCards = [
    {
      label: "Customers",
      value: data.summary.totalCustomers,
      hint: "New customers in range",
      icon: Users,
    },
    {
      label: "Conversations",
      value: data.summary.totalConversations,
      hint: "Total conversations in range",
      icon: MessagesSquare,
    },
    {
      label: "Open conversations",
      value: data.summary.openConversations,
      hint: "Currently open",
      icon: CircleDot,
    },
    {
      label: "Pending conversations",
      value: data.summary.pendingConversations,
      hint: "Waiting for follow-up",
      icon: Clock3,
    },
    {
      label: "Resolved conversations",
      value: data.summary.resolvedConversations,
      hint: "Resolved in selected set",
      icon: CheckCircle2,
    },
    {
      label: "Tickets",
      value: data.summary.totalTickets,
      hint: "Total tickets in range",
      icon: Ticket,
    },
    {
      label: "Open tickets",
      value: data.summary.openTickets,
      hint: "Currently open",
      icon: AlertCircle,
    },
    {
      label: "Resolved / closed",
      value: data.summary.resolvedClosedTickets,
      hint: "Completed ticket work",
      icon: CheckCircle2,
    },
    {
      label: "Attachments",
      value: data.summary.attachmentsCount,
      hint: "Files uploaded in range",
      icon: Paperclip,
    },
    {
      label: "Teams",
      value: data.summary.teamCount,
      hint: "Current operational teams",
      icon: UsersRound,
    },
  ];

  return (
    <div className="space-y-5">
      <section
        aria-label="Support summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BreakdownPanel
          title="Conversations by channel"
          description="Where customer conversations originated."
          items={data.conversationsByChannel}
        />
        <BreakdownPanel
          title="Conversation status"
          description="Current workflow state for conversations in range."
          items={data.conversationsByStatus}
        />
        <BreakdownPanel
          title="Tickets by status"
          description="Current lifecycle state for tickets in range."
          items={data.ticketsByStatus}
        />
        <BreakdownPanel
          title="Tickets by priority"
          description="How ticket urgency is distributed."
          items={data.ticketsByPriority}
        />
        <TeamWorkload
          tickets={data.ticketsByTeam}
          conversations={data.conversationsByTeam}
        />
        <RecentActivityPanel activities={data.recentActivity} />
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const analyticsQuery = useQuery({
    queryKey: queryKeys.analyticsOverview(range),
    queryFn: () => getAnalyticsOverview(token!, range),
    enabled: Boolean(token),
  });

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-oc-accent-2">
              <Inbox className="h-4 w-4" />
              Support operations
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-oc-text">
              Analytics dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-oc-muted">
              Understand customer demand, ticket workload, channels, and team
              activity using current CRM data.
            </p>
          </div>

          <div
            role="group"
            aria-label="Analytics time range"
            className="grid grid-cols-2 gap-1 rounded-lg border border-oc-border bg-oc-panel p-1 sm:flex"
          >
            {ranges.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={range === option.value}
                onClick={() => setRange(option.value)}
                className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent ${
                  range === option.value
                    ? "bg-oc-accent text-white"
                    : "text-oc-muted hover:bg-oc-elevated hover:text-oc-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {analyticsQuery.isLoading && <AnalyticsSkeleton />}

        {analyticsQuery.isError && (
          <Card className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-oc-warning" />
            <h2 className="mt-4 text-base font-semibold text-oc-text">
              Analytics could not be loaded
            </h2>
            <p className="mt-2 max-w-md text-sm text-oc-muted">
              {getErrorMessage(
                analyticsQuery.error,
                "Unable to retrieve support analytics.",
              )}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => analyticsQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </Card>
        )}

        {analyticsQuery.data && <Dashboard data={analyticsQuery.data} />}
      </div>
    </div>
  );
}
