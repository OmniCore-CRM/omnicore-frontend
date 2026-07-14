import { apiFetch } from "./client";
import type {
  FeedbackDetractorList,
  FeedbackEscalation,
  FeedbackEscalationStatus,
  FeedbackOverview,
  FeedbackOverviewRange,
  FeedbackPublicSurvey,
  FeedbackTriggerConfig,
  FeedbackTriggerMode,
  FeedbackTriggerSource,
  PublicFeedbackSubmissionResult,
} from "@/types/models";

export type FeedbackOverviewRequest =
  (
    | { range: FeedbackOverviewRange | "all" }
    | { startDate: string; endDate: string }
  ) & {
    teamId?: string;
    channel?: "WEBSITE" | "WHATSAPP" | "EMAIL" | "INSTAGRAM";
    assigneeId?: string;
  };

export async function getFeedbackOverview(
  token: string,
  request: FeedbackOverviewRequest
): Promise<FeedbackOverview> {
  const query = new URLSearchParams();

  if ("range" in request) {
    query.set("range", request.range);
  } else {
    query.set("startDate", request.startDate);
    query.set("endDate", request.endDate);
  }

  if (request.teamId) query.set("teamId", request.teamId);
  if (request.channel) query.set("channel", request.channel);
  if (request.assigneeId) query.set("assigneeId", request.assigneeId);

  return apiFetch<FeedbackOverview>(`/feedback/overview?${query}`, { token });
}

export async function listFeedbackDetractors(
  token: string,
  params: {
    status?: FeedbackEscalationStatus;
    cursor?: string;
    limit?: number;
  } = {}
): Promise<FeedbackDetractorList> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));

  const suffix = query.toString();
  return apiFetch<FeedbackDetractorList>(
    suffix ? `/feedback/detractors?${suffix}` : "/feedback/detractors",
    { token }
  );
}

export async function getFeedbackTriggerConfig(
  token: string
): Promise<FeedbackTriggerConfig[]> {
  return apiFetch<FeedbackTriggerConfig[]>("/feedback/trigger-config", { token });
}

export async function updateFeedbackTriggerConfig(
  token: string,
  payload: {
    source: FeedbackTriggerSource;
    mode: FeedbackTriggerMode;
  }
): Promise<FeedbackTriggerConfig> {
  return apiFetch<FeedbackTriggerConfig>("/feedback/trigger-config", {
    token,
    method: "PUT",
    body: payload,
  });
}

export async function updateFeedbackEscalation(
  token: string,
  id: string,
  payload: {
    status: FeedbackEscalationStatus;
    assignedToId?: string | null;
    reason?: string | null;
  }
): Promise<FeedbackEscalation> {
  return apiFetch<FeedbackEscalation>(`/feedback/escalations/${id}`, {
    token,
    method: "PATCH",
    body: payload,
  });
}

export async function getPublicFeedbackSurvey(
  token: string
): Promise<FeedbackPublicSurvey> {
  return apiFetch<FeedbackPublicSurvey>(`/feedback/public/${token}`);
}

export async function submitPublicFeedbackSurvey(
  token: string,
  payload: {
    score: number;
    comment?: string;
  }
): Promise<PublicFeedbackSubmissionResult> {
  return apiFetch<PublicFeedbackSubmissionResult>(`/feedback/public/${token}`, {
    method: "POST",
    body: payload,
  });
}
