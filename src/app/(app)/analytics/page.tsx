"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import {
  type AnalyticsOverviewRequest,
  getAnalyticsOverview,
} from "@/api/analytics";
import { listTeams } from "@/api/teams";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AnalyticsAgentPerformanceItem,
  AnalyticsBreakdownItem,
  AnalyticsOverview,
  AnalyticsPresetRange,
  AnalyticsRecentActivity,
  AnalyticsTeamItem,
  ConversationChannel,
  SlaStatus,
  Team,
} from "@/types/models";

const ranges: { value: AnalyticsPresetRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const channelOptions: Array<{ value: ConversationChannel; label: string }> = [
  { value: "WEBSITE", label: "Website" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "INSTAGRAM", label: "Instagram" },
];

const slaOptions: Array<{ value: SlaStatus; label: string }> = [
  { value: "ON_TRACK", label: "On track" },
  { value: "AT_RISK", label: "At risk" },
  { value: "BREACHED", label: "Breached" },
  { value: "PAUSED", label: "Paused" },
];

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value: string | null) =>
  Boolean(value && isoDatePattern.test(value) && isValid(parseISO(value)));

const isPresetRange = (value: string | null): value is AnalyticsPresetRange =>
  value === "7d" || value === "30d" || value === "90d";

const isSlaStatus = (value: string | null): value is SlaStatus =>
  value === "ON_TRACK" ||
  value === "AT_RISK" ||
  value === "BREACHED" ||
  value === "PAUSED";

const isConversationChannel = (
  value: string | null,
): value is ConversationChannel =>
  value === "WEBSITE" ||
  value === "WHATSAPP" ||
  value === "EMAIL" ||
  value === "INSTAGRAM";

const isValidCustomRange = (startDate: string | null, endDate: string | null) => {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return false;
  const start = parseISO(startDate!);
  const end = parseISO(endDate!);
  return end.getTime() >= start.getTime();
};

const formatRangeLabel = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (!isValid(start) || !isValid(end)) return "Custom range";

  return `${format(start, "MMM d")} -> ${format(end, "MMM d")}`;
};

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

const formatDelta = (value: number | null) => {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const formatMinutes = (value: number | null) =>
  value === null ? "-" : `${value.toFixed(1)}m`;

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
  const max = Math.max(...rows.map((row) => row.tickets + row.conversations), 1);

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

function TimingAndSlaPanel({ data }: { data: AnalyticsOverview }) {
  const slaTotal = data.sla.onTrack + data.sla.atRisk + data.sla.breached + data.sla.paused;

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-oc-text">Response and SLA health</h2>
          <p className="mt-1 text-sm text-oc-muted">
            First response, resolution time, and SLA compliance from ticket lifecycle data.
          </p>
        </div>
        <Link
          href="/tickets?slaStatus=BREACHED"
          className="inline-flex h-8 items-center rounded-md border border-oc-border px-3 text-xs font-medium text-oc-muted transition-colors hover:bg-oc-panel hover:text-oc-text"
        >
          Drill into breached
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-oc-border bg-oc-panel p-3">
          <p className="text-xs text-oc-muted">Avg first response</p>
          <p className="mt-1 text-lg font-semibold text-oc-text">
            {formatMinutes(data.metrics.firstResponseAvgMinutes)}
          </p>
          <p className="text-xs text-oc-faint">n={data.metrics.firstResponseSampleSize}</p>
        </div>
        <div className="rounded-lg border border-oc-border bg-oc-panel p-3">
          <p className="text-xs text-oc-muted">Avg resolution</p>
          <p className="mt-1 text-lg font-semibold text-oc-text">
            {formatMinutes(data.metrics.resolutionAvgMinutes)}
          </p>
          <p className="text-xs text-oc-faint">n={data.metrics.resolutionSampleSize}</p>
        </div>
        <div className="rounded-lg border border-oc-border bg-oc-panel p-3">
          <p className="text-xs text-oc-muted">SLA compliance</p>
          <p className="mt-1 text-lg font-semibold text-oc-text">
            {data.sla.complianceRatePct === null ? "-" : `${data.sla.complianceRatePct.toFixed(1)}%`}
          </p>
          <p className="text-xs text-oc-faint">Total scoped tickets: {slaTotal}</p>
        </div>
        <div className="rounded-lg border border-oc-border bg-oc-panel p-3">
          <p className="text-xs text-oc-muted">SLA breached</p>
          <p className="mt-1 text-lg font-semibold text-oc-warning">{data.sla.breached}</p>
          <p className="text-xs text-oc-faint">At risk: {data.sla.atRisk}</p>
        </div>
      </div>
    </Card>
  );
}

function TrendPanel({ data }: { data: AnalyticsOverview }) {
  const max = Math.max(
    ...data.trends.daily.map((point) =>
      Math.max(point.conversations, point.tickets, point.resolvedTickets, point.breachedTickets),
    ),
    1,
  );

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-oc-text">Historical trend</h2>
          <p className="mt-1 text-sm text-oc-muted">
            Daily conversations, tickets, resolutions, and SLA breaches.
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-oc-accent-2" />
      </div>

      {data.trends.daily.length ? (
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-[620px] items-end gap-1.5">
            {data.trends.daily.map((point) => {
              const total =
                point.conversations + point.tickets + point.resolvedTickets + point.breachedTickets;
              const height = Math.max((total / (max * 3)) * 150, 4);
              return (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-[150px] w-full items-end justify-center">
                    <div
                      className="w-full rounded-sm bg-violet-400/80"
                      style={{ height }}
                      title={`${point.date}: conv ${point.conversations}, tix ${point.tickets}, resolved ${point.resolvedTickets}, breached ${point.breachedTickets}`}
                    />
                  </div>
                  <span className="text-[10px] text-oc-faint">{point.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-oc-muted">
            <span>Conversations: {data.trends.daily.reduce((sum, p) => sum + p.conversations, 0)}</span>
            <span>Tickets: {data.trends.daily.reduce((sum, p) => sum + p.tickets, 0)}</span>
            <span>Resolved: {data.trends.daily.reduce((sum, p) => sum + p.resolvedTickets, 0)}</span>
            <span>Breached: {data.trends.daily.reduce((sum, p) => sum + p.breachedTickets, 0)}</span>
          </div>
        </div>
      ) : (
        <PanelEmpty message="No trend points in this range." />
      )}
    </Card>
  );
}

function ComparisonPanel({ data }: { data: AnalyticsOverview }) {
  const deltas = data.comparison.deltas;

  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold text-oc-text">Period comparison</h2>
        <p className="mt-1 text-sm text-oc-muted">
          Change versus previous equivalent period.
        </p>
      </div>

      {deltas ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricDelta label="Conversations" value={deltas.totalConversationsPct} />
          <MetricDelta label="Tickets" value={deltas.totalTicketsPct} />
          <MetricDelta label="Resolved/Closed" value={deltas.resolvedClosedTicketsPct} />
          <MetricDelta label="SLA breached" value={deltas.breachedTicketsPct} invert />
          <MetricDelta
            label="Avg first response"
            value={deltas.firstResponseAvgMinutesPct}
            invert
          />
          <MetricDelta
            label="Avg resolution"
            value={deltas.resolutionAvgMinutesPct}
            invert
          />
        </div>
      ) : (
        <PanelEmpty message="Comparison unavailable for this filter and range." />
      )}
    </Card>
  );
}

function MetricDelta({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number | null;
  invert?: boolean;
}) {
  const tone =
    value === null
      ? "text-oc-muted"
      : (value > 0) !== invert
        ? "text-emerald-400"
        : value < 0
          ? "text-rose-400"
          : "text-oc-muted";

  return (
    <div className="rounded-lg border border-oc-border bg-oc-panel p-3">
      <p className="text-xs text-oc-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{formatDelta(value)}</p>
    </div>
  );
}

function AgentPerformancePanel({
  agents,
  teamId,
}: {
  agents: AnalyticsAgentPerformanceItem[];
  teamId: string | null;
}) {
  return (
    <Card className="min-w-0 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-oc-text">Agent performance</h2>
          <p className="mt-1 text-sm text-oc-muted">
            Ticket ownership, resolution output, and response efficiency.
          </p>
        </div>
        <Link
          href={`/tickets${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`}
          className="inline-flex h-8 items-center rounded-md border border-oc-border px-3 text-xs font-medium text-oc-muted transition-colors hover:bg-oc-panel hover:text-oc-text"
        >
          Drill into tickets
        </Link>
      </div>

      {agents.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-oc-border text-left text-xs uppercase tracking-wide text-oc-faint">
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Assigned</th>
                <th className="px-2 py-2">Resolved</th>
                <th className="px-2 py-2">Breached</th>
                <th className="px-2 py-2">Avg first response</th>
                <th className="px-2 py-2">Avg resolution</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.assigneeId} className="border-b border-oc-border/70">
                  <td className="px-2 py-2 font-medium text-oc-text">{agent.name}</td>
                  <td className="px-2 py-2 text-oc-muted">{agent.assignedTickets}</td>
                  <td className="px-2 py-2 text-oc-muted">{agent.resolvedTickets}</td>
                  <td className="px-2 py-2 text-oc-warning">{agent.breachedTickets}</td>
                  <td className="px-2 py-2 text-oc-muted">{formatMinutes(agent.avgFirstResponseMinutes)}</td>
                  <td className="px-2 py-2 text-oc-muted">{formatMinutes(agent.avgResolutionMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <PanelEmpty message="No assigned-agent data in this scope." />
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
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function Dashboard({ data, selectedTeamId }: { data: AnalyticsOverview; selectedTeamId: string | null }) {
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
        <TimingAndSlaPanel data={data} />
        <ComparisonPanel data={data} />
        <TrendPanel data={data} />
        <AgentPerformancePanel agents={data.agentPerformance} teamId={selectedTeamId} />
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  const selection = useMemo(() => {
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const range = searchParams.get("range");
    const teamId = searchParams.get("teamId");
    const channel = searchParams.get("channel");
    const slaStatus = searchParams.get("slaStatus");
    const comparePrevious = searchParams.get("comparePrevious") !== "false";

    if (isValidCustomRange(startDate, endDate)) {
      return {
        presetRange: "30d" as AnalyticsPresetRange,
        customRange: {
          startDate: startDate!,
          endDate: endDate!,
        },
        teamId,
        channel: isConversationChannel(channel) ? channel : null,
        slaStatus: isSlaStatus(slaStatus) ? slaStatus : null,
        comparePrevious,
      };
    }

    return {
      presetRange: isPresetRange(range) ? range : ("30d" as AnalyticsPresetRange),
      customRange: null,
      teamId,
      channel: isConversationChannel(channel) ? channel : null,
      slaStatus: isSlaStatus(slaStatus) ? slaStatus : null,
      comparePrevious,
    };
  }, [searchParams]);

  const presetRange = selection.presetRange;
  const customRange = selection.customRange;

  const updateSearch = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const request = useMemo<AnalyticsOverviewRequest>(
    () => ({
      ...(customRange
        ? { startDate: customRange.startDate, endDate: customRange.endDate }
        : { range: presetRange }),
      ...(selection.teamId ? { teamId: selection.teamId } : {}),
      ...(selection.channel ? { channel: selection.channel } : {}),
      ...(selection.slaStatus ? { slaStatus: selection.slaStatus } : {}),
      comparePrevious: selection.comparePrevious,
    }),
    [customRange, presetRange, selection.channel, selection.comparePrevious, selection.slaStatus, selection.teamId],
  );

  const analyticsKeyParams = useMemo<Record<string, string>>(
    () => {
      const params: Record<string, string> = "range" in request
        ? { range: request.range }
        : {
            startDate: request.startDate,
            endDate: request.endDate,
          };

      if (request.teamId) params.teamId = request.teamId;
      if (request.channel) params.channel = request.channel;
      if (request.slaStatus) params.slaStatus = request.slaStatus;
      if (request.comparePrevious === false) params.comparePrevious = "false";

      return params;
    },
    [request],
  );

  const customLabel =
    customRange
      ? formatRangeLabel(customRange.startDate, customRange.endDate)
      : "Custom range";

  const canApplyCustom = isValidCustomRange(draftStartDate, draftEndDate);

  const selectPreset = (range: AnalyticsPresetRange) => {
    setIsCustomPickerOpen(false);
    updateSearch({ range, startDate: null, endDate: null });
  };

  const applyCustom = () => {
    if (!canApplyCustom) return;
    setIsCustomPickerOpen(false);
    updateSearch({
      startDate: draftStartDate,
      endDate: draftEndDate,
      range: null,
    });
  };

  const cancelCustom = () => {
    if (customRange) {
      setDraftStartDate(customRange.startDate);
      setDraftEndDate(customRange.endDate);
    } else {
      setDraftStartDate("");
      setDraftEndDate("");
    }
    setIsCustomPickerOpen(false);
  };

  const analyticsQuery = useQuery({
    queryKey: queryKeys.analyticsOverview(analyticsKeyParams),
    queryFn: () => getAnalyticsOverview(token!, request),
    enabled: Boolean(token),
    staleTime: 2 * 60_000,
    placeholderData: (previous) => previous,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });

  const teams: Team[] = teamsQuery.data ?? [];

  return (
    <div className="h-full overflow-y-auto p-3 md:p-4">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-oc-accent-2">
              <Inbox className="h-4 w-4" />
              Support operations
            </div>
            <h1 className="mt-1.5 text-xl font-semibold text-oc-text">
              Analytics dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-oc-muted">
              Tenant-scoped operational analytics with SLA, agent performance, and trend reporting.
            </p>
          </div>

          <div
            role="group"
            aria-label="Analytics time range"
            className="relative grid grid-cols-2 gap-1 rounded-lg border border-oc-border bg-oc-panel p-1 sm:flex"
          >
            {ranges.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={!customRange && presetRange === option.value}
                onClick={() => selectPreset(option.value)}
                className={`h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent ${
                  !customRange && presetRange === option.value
                    ? "bg-oc-accent text-white"
                    : "text-oc-muted hover:bg-oc-elevated hover:text-oc-text"
                }`}
              >
                {option.label}
              </button>
            ))}

            <button
              type="button"
              aria-pressed={Boolean(customRange)}
              onClick={() => {
                if (customRange) {
                  setDraftStartDate(customRange.startDate);
                  setDraftEndDate(customRange.endDate);
                }
                setIsCustomPickerOpen((open) => !open);
              }}
              className={`h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent ${
                customRange
                  ? "bg-oc-accent text-white"
                  : "text-oc-muted hover:bg-oc-elevated hover:text-oc-text"
              }`}
            >
              {customLabel}
            </button>

            {isCustomPickerOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                  aria-label="Close date range picker"
                  onClick={cancelCustom}
                />
                <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border border-oc-border bg-oc-bg-mid p-4 shadow-2xl md:absolute md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:inset-x-auto md:z-50 md:w-[320px] md:rounded-xl">
                  <p className="text-sm font-semibold text-oc-text">Custom range</p>
                  <p className="mt-1 text-xs text-oc-muted">
                    Choose start and end dates to filter analytics.
                  </p>

                  <div className="mt-3 grid gap-3">
                    <label className="text-xs font-medium text-oc-faint">
                      Start date
                      <input
                        type="date"
                        value={draftStartDate}
                        onChange={(event) => setDraftStartDate(event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                      />
                    </label>
                    <label className="text-xs font-medium text-oc-faint">
                      End date
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={(event) => setDraftEndDate(event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={cancelCustom}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canApplyCustom}
                      onClick={applyCustom}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <Card className="p-3 md:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-oc-faint">
              Team filter
              <select
                className="mt-1 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                value={selection.teamId ?? ""}
                onChange={(event) => updateSearch({ teamId: event.target.value || null })}
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-oc-faint">
              Channel filter
              <select
                className="mt-1 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                value={selection.channel ?? ""}
                onChange={(event) =>
                  updateSearch({
                    channel: event.target.value || null,
                  })
                }
              >
                <option value="">All channels</option>
                {channelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-oc-faint">
              SLA filter
              <select
                className="mt-1 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                value={selection.slaStatus ?? ""}
                onChange={(event) => updateSearch({ slaStatus: event.target.value || null })}
              >
                <option value="">All SLA states</option>
                {slaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text">
              <input
                type="checkbox"
                checked={selection.comparePrevious}
                onChange={(event) =>
                  updateSearch({
                    comparePrevious: event.target.checked ? null : "false",
                  })
                }
              />
              Compare to previous period
            </label>
          </div>
        </Card>

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

        {analyticsQuery.data && (
          <Dashboard data={analyticsQuery.data} selectedTeamId={selection.teamId ?? null} />
        )}
      </div>
    </div>
  );
}
