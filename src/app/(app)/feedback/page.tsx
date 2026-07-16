"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Link2, Loader2, RefreshCw, Send } from "lucide-react";
import {
  deliverPendingFeedbackSurvey,
  getFeedbackOverview,
  listFeedbackDetractors,
  listPendingFeedbackSurveys,
  reissuePendingFeedbackSurveyToken,
  revealPendingFeedbackSurveyLink,
  type FeedbackOverviewRequest,
} from "@/api/feedback";
import { listTeams } from "@/api/teams";
import { listUsers } from "@/api/users";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { usePerformanceMetrics } from "@/hooks/use-performance-metrics";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type {
  ConversationChannel,
  FeedbackEscalationStatus,
  FeedbackOverviewRange,
  FeedbackPendingSurveyItem,
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
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  // Capture performance metrics for the feedback route (Priority 6)
  usePerformanceMetrics({
    route: "/feedback",
    shellSelector: "header, banner, [role='banner']",
    contentSelector: "main",
    enableLogging: true,
  });

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

  const pendingSurveysQuery = useQuery({
    queryKey: queryKeys.feedbackPendingSurveys({ status: "pending,sent" }),
    queryFn: () => listPendingFeedbackSurveys(token!, { limit: 8 }),
    enabled: Boolean(token),
  });

  const copyLinkMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const result = await revealPendingFeedbackSurveyLink(token!, surveyId);
      await navigator.clipboard.writeText(result.url);
      return result;
    },
    onSuccess: () => {
      toast.success("Survey link copied");
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackPendingSurveys() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not copy survey link"));
    },
  });

  const reissueTokenMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const result = await reissuePendingFeedbackSurveyToken(token!, surveyId, {
        reason: "operator_reissue",
      });
      await navigator.clipboard.writeText(result.url);
      return result;
    },
    onSuccess: () => {
      toast.success("Survey token reissued and new link copied");
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackPendingSurveys() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not reissue survey token"));
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (survey: FeedbackPendingSurveyItem) => {
      if (!survey.channel) throw new Error("Survey channel is unavailable");
      if (
        survey.channel !== "WHATSAPP" &&
        survey.channel !== "EMAIL" &&
        survey.channel !== "WEBSITE"
      ) {
        throw new Error("This survey channel cannot be sent from this workspace");
      }

      return deliverPendingFeedbackSurvey(token!, survey.id, {
        channel: survey.channel,
      });
    },
    onSuccess: (result) => {
      toast.success(
        result.accepted
          ? "Survey delivery accepted by provider"
          : "Survey delivery attempted but not accepted",
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackPendingSurveys() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not deliver survey"));
    },
  });

  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled([
        overviewQuery.refetch({ throwOnError: true }),
        detractorsQuery.refetch({ throwOnError: true }),
        pendingSurveysQuery.refetch({ throwOnError: true }),
        teamsQuery.refetch({ throwOnError: true }),
        usersQuery.refetch({ throwOnError: true }),
      ]);

      const failed = results.some((result) => result.status === "rejected");
      if (failed) {
        throw new Error("One or more feedback data requests failed");
      }
    },
    onSuccess: () => {
      toast.success("Feedback data refreshed");
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          "Refresh failed for one or more feedback panels. Please try again."
        )
      );
    },
  });

  const loading = overviewQuery.isLoading || detractorsQuery.isLoading;
  const analyticsError = overviewQuery.isError || detractorsQuery.isError;

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
  const overview = overviewQuery.data;
  const detractors = detractorsQuery.data;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      {analyticsError ? (
        <Card className="mb-4 border-red-500/40 bg-red-500/10 p-4 text-sm text-oc-muted">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <h2 className="text-sm font-semibold text-oc-text">Some feedback analytics failed to load</h2>
                <p className="mt-1 max-w-2xl text-sm text-oc-muted">
                  {getErrorMessage(
                    overviewQuery.error ?? detractorsQuery.error,
                    "The page will stay available while the failed panels retry."
                  )}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void overviewQuery.refetch();
                void detractorsQuery.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry analytics
            </Button>
          </div>
        </Card>
      ) : null}

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
          value={overview ? formatNumber(overview.summary.totalResponses) : "—"}
          hint="All feedback submissions in selected filters."
        />
        <SummaryTile
          label="CSAT average"
          value={overview ? formatScore(overview.csat.average) : "—"}
          hint={overview ? `${formatNumber(overview.csat.responses)} responses` : "Waiting for analytics data"}
        />
        <SummaryTile
          label="NPS score"
          value={overview ? formatScore(overview.nps.score) : "—"}
          hint={overview ? `${formatNumber(overview.nps.responses)} responses` : "Waiting for analytics data"}
        />
        <SummaryTile
          label="Open detractors"
          value={overview ? formatNumber(overview.summary.openDetractorEscalations) : "—"}
          hint={overview ? "Open and in-progress escalations." : "Waiting for analytics data"}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-base font-semibold text-oc-text">Sentiment mix</h2>
          {overview ? (
            <div className="mt-4 space-y-3">
              {[
                ["Detractor", overview.sentiments.detractor],
                ["Neutral", overview.sentiments.neutral],
                ["Satisfied", overview.sentiments.satisfied],
                ["Passive", overview.sentiments.passive],
                ["Promoter", overview.sentiments.promoter],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-oc-muted">{label}</span>
                  <span className="font-medium text-oc-text">{formatNumber(Number(value))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-oc-muted">Sentiment data is unavailable until analytics finish loading.</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-semibold text-oc-text">Response trend</h2>
          {overview?.trends.length ? (
            <div className="mt-4 space-y-2">
              {overview.trends.slice(-10).map((point) => (
                <div key={point.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                  <span className="text-oc-muted">{point.date}</span>
                  <span className="text-oc-text">{point.responses} responses</span>
                  <span className="text-red-300">{point.detractors} detractors</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-oc-muted">
              {overview ? "No trend data for this range." : "Trend data is unavailable until analytics finish loading."}
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-oc-text">Pending survey handoff</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshAllMutation.isPending}
            aria-disabled={refreshAllMutation.isPending}
            aria-busy={refreshAllMutation.isPending}
            onClick={() => refreshAllMutation.mutate()}
          >
            {refreshAllMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {pendingSurveysQuery.isError ? (
          <p className="mt-4 text-sm text-red-300">
            {getErrorMessage(pendingSurveysQuery.error, "Could not load pending surveys")}
          </p>
        ) : pendingSurveysQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : pendingSurveysQuery.data?.items.length ? (
          <div className="mt-4 space-y-3">
            {pendingSurveysQuery.data.items.map((survey) => {
              const sending = deliverMutation.isPending && deliverMutation.variables?.id === survey.id;
              const copying = copyLinkMutation.isPending && copyLinkMutation.variables === survey.id;
              const reissuing =
                reissueTokenMutation.isPending && reissueTokenMutation.variables === survey.id;

              return (
                <div key={survey.id} className="rounded-lg border border-oc-border bg-oc-bg-mid/40 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-oc-muted">
                    <span className="rounded-full border border-oc-border px-2 py-0.5">{survey.type}</span>
                    <span className="rounded-full border border-oc-border px-2 py-0.5">
                      {survey.channel ?? "UNKNOWN"}
                    </span>
                    <span className="rounded-full border border-oc-border px-2 py-0.5">
                      {survey.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-oc-text">
                    {survey.customer.firstName} {survey.customer.lastName ?? ""}
                  </p>
                  <p className="mt-1 text-xs text-oc-faint">
                    Created {formatDistanceToNow(new Date(survey.createdAt), { addSuffix: true })}
                  </p>

                  {survey.sendCapabilities.providerReady ? null : (
                    <p className="mt-2 text-xs text-yellow-300">{survey.sendCapabilities.providerReason}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={copying || reissuing || sending}
                      aria-disabled={copying || reissuing || sending}
                      aria-busy={copying || reissuing}
                      onClick={() => {
                        if (survey.handoff.linkAvailable) {
                          copyLinkMutation.mutate(survey.id);
                        } else {
                          reissueTokenMutation.mutate(survey.id);
                        }
                      }}
                    >
                      {copying || reissuing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4" />
                      )}
                      {copying
                        ? "Copying..."
                        : reissuing
                          ? "Reissuing..."
                          : survey.handoff.linkAvailable
                            ? "Copy link"
                            : "Reissue and copy"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        sending ||
                        copying ||
                        reissuing ||
                        !survey.sendCapabilities.canAttemptSend ||
                        !survey.sendCapabilities.providerReady
                      }
                      aria-disabled={
                        sending ||
                        copying ||
                        reissuing ||
                        !survey.sendCapabilities.canAttemptSend ||
                        !survey.sendCapabilities.providerReady
                      }
                      aria-busy={sending}
                      onClick={() => deliverMutation.mutate(survey)}
                    >
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {sending ? "Sending..." : "Send now"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-oc-muted">No pending feedback surveys awaiting handoff.</p>
        )}
      </Card>

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

        {detractorsQuery.isError ? (
          <p className="mt-4 text-sm text-red-300">
            {getErrorMessage(detractorsQuery.error, "Could not load detractor escalations")}
          </p>
        ) : detractors?.items.length ? (
          <div className="mt-4 space-y-3">
            {detractors.items.map((item) => (
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
