"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  getFeedbackOverview,
  listFeedbackDetractors,
  type FeedbackOverviewRequest,
} from "@/api/feedback";
import { listTeams } from "@/api/teams";
import { listUsers } from "@/api/users";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ConversationChannel,
  FeedbackEscalationStatus,
  FeedbackOverviewRange,
} from "@/types/models";

const rangeOptions: Array<{ value: FeedbackOverviewRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const escalationStatusOptions: Array<{
  value: "all" | FeedbackEscalationStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

const channelOptions: Array<{ value: "all" | ConversationChannel; label: string }> = [
  { value: "all", label: "All channels" },
  { value: "WEBSITE", label: "Website" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "INSTAGRAM", label: "Instagram" },
];

const formatNumber = (value: number) => value.toLocaleString();

const formatScore = (value: number | null) => (value === null ? "-" : value.toFixed(1));

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-oc-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-oc-text">{value}</p>
      <p className="mt-2 text-xs text-oc-faint">{hint}</p>
    </Card>
  );
}

export default function FeedbackPage() {
  const token = useAuthStore((s) => s.accessToken);

  const [range, setRange] = useState<FeedbackOverviewRange>("30d");
  const [teamId, setTeamId] = useState<string>("all");
  const [channel, setChannel] = useState<"all" | ConversationChannel>("all");
  const [assigneeId, setAssigneeId] = useState<string>("all");
  const [detractorStatus, setDetractorStatus] = useState<"all" | FeedbackEscalationStatus>("all");

  const overviewRequest = useMemo<FeedbackOverviewRequest>(
    () => ({
      range,
      ...(teamId !== "all" ? { teamId } : {}),
      ...(channel !== "all" ? { channel } : {}),
      ...(assigneeId !== "all" ? { assigneeId } : {}),
    }),
    [range, teamId, channel, assigneeId]
  );

  const serializedFilters = useMemo(
    () => ({
      range,
      teamId,
      channel,
      assigneeId,
    }),
    [range, teamId, channel, assigneeId]
  );

  const overviewQuery = useQuery({
    queryKey: queryKeys.feedbackOverview(
      Object.fromEntries(
        Object.entries(serializedFilters).filter(([, value]) => value && value !== "all")
      ) as Record<string, string>
    ),
    queryFn: () => getFeedbackOverview(token!, overviewRequest),
    enabled: Boolean(token),
  });

  const detractorsQuery = useQuery({
    queryKey: queryKeys.feedbackDetractors({ status: detractorStatus }),
    queryFn: () =>
      listFeedbackDetractors(token!, {
        ...(detractorStatus !== "all" ? { status: detractorStatus } : {}),
        limit: 10,
      }),
    enabled: Boolean(token),
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token!),
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => listUsers(token!),
    enabled: Boolean(token),
  });

  const loading = overviewQuery.isLoading || detractorsQuery.isLoading;
  const hasError = overviewQuery.isError || detractorsQuery.isError;

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (hasError || !overviewQuery.data || !detractorsQuery.data) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6">
        <Card className="mx-auto max-w-2xl p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <h2 className="mt-3 text-lg font-semibold text-oc-text">Unable to load feedback analytics</h2>
          <p className="mt-2 text-sm text-oc-muted">
            {getErrorMessage(overviewQuery.error ?? detractorsQuery.error, "Try refreshing this page.")}
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              void overviewQuery.refetch();
              void detractorsQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const data = overviewQuery.data;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-oc-border bg-oc-panel p-3">
        <label className="flex min-w-[130px] flex-col gap-1 text-xs text-oc-muted">
          Range
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as FeedbackOverviewRange)}
            className="h-9 rounded-md border border-oc-border bg-oc-bg px-2 text-sm text-oc-text"
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[140px] flex-col gap-1 text-xs text-oc-muted">
          Team
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="h-9 rounded-md border border-oc-border bg-oc-bg px-2 text-sm text-oc-text"
          >
            <option value="all">All teams</option>
            {(teamsQuery.data ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[150px] flex-col gap-1 text-xs text-oc-muted">
          Channel
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as "all" | ConversationChannel)}
            className="h-9 rounded-md border border-oc-border bg-oc-bg px-2 text-sm text-oc-text"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[180px] flex-col gap-1 text-xs text-oc-muted">
          Assignee
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="h-9 rounded-md border border-oc-border bg-oc-bg px-2 text-sm text-oc-text"
          >
            <option value="all">All assignees</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Total responses"
          value={formatNumber(data.summary.totalResponses)}
          hint="All feedback submissions in selected filters."
        />
        <SummaryTile
          label="CSAT average"
          value={formatScore(data.csat.average)}
          hint={`${formatNumber(data.csat.responses)} responses`}
        />
        <SummaryTile
          label="NPS score"
          value={formatScore(data.nps.score)}
          hint={`${formatNumber(data.nps.responses)} responses`}
        />
        <SummaryTile
          label="Open detractors"
          value={formatNumber(data.summary.openDetractorEscalations)}
          hint="Open and in-progress escalations."
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-base font-semibold text-oc-text">Sentiment mix</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Detractor", data.sentiments.detractor],
              ["Neutral", data.sentiments.neutral],
              ["Satisfied", data.sentiments.satisfied],
              ["Passive", data.sentiments.passive],
              ["Promoter", data.sentiments.promoter],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-oc-muted">{label}</span>
                <span className="font-medium text-oc-text">{formatNumber(Number(value))}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-semibold text-oc-text">Response trend</h2>
          {data.trends.length ? (
            <div className="mt-4 space-y-2">
              {data.trends.slice(-10).map((point) => (
                <div key={point.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                  <span className="text-oc-muted">{point.date}</span>
                  <span className="text-oc-text">{point.responses} responses</span>
                  <span className="text-red-300">{point.detractors} detractors</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-oc-muted">No trend data for this range.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-oc-text">Detractor review queue</h2>
          <label className="flex items-center gap-2 text-xs text-oc-muted">
            Status
            <select
              value={detractorStatus}
              onChange={(event) => setDetractorStatus(event.target.value as "all" | FeedbackEscalationStatus)}
              className="h-8 rounded-md border border-oc-border bg-oc-bg px-2 text-sm text-oc-text"
            >
              {escalationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {detractorsQuery.data.items.length ? (
          <div className="mt-4 space-y-3">
            {detractorsQuery.data.items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-oc-border bg-oc-bg-mid/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-oc-muted">
                  <span className="rounded-full border border-oc-border px-2 py-0.5">
                    {item.response.type}
                  </span>
                  <span className="rounded-full border border-oc-border px-2 py-0.5">
                    Score {item.response.score}
                  </span>
                  <span className="rounded-full border border-oc-border px-2 py-0.5 text-red-300">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-oc-text">
                  {item.customer.firstName} {item.customer.lastName ?? ""}
                </p>
                {item.response.comment ? (
                  <p className="mt-2 text-sm text-oc-muted">{item.response.comment}</p>
                ) : (
                  <p className="mt-2 text-sm text-oc-faint">No comment provided.</p>
                )}
                <p className="mt-2 text-xs text-oc-faint">
                  Submitted {formatDistanceToNow(new Date(item.response.submittedAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-oc-muted">No detractor escalations found for this filter.</p>
        )}
      </Card>
    </div>
  );
}
