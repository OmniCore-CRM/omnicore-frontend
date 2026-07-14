import { apiFetch } from "./client";
import type {
  ConversationChannel,
  AnalyticsOverview,
  AnalyticsPresetRange,
  SlaStatus,
} from "@/types/models";

export type AnalyticsOverviewRequest =
  (
    | { range: AnalyticsPresetRange | "all" }
    | { startDate: string; endDate: string }
  ) & {
    teamId?: string;
    channel?: ConversationChannel;
    slaStatus?: SlaStatus;
    comparePrevious?: boolean;
  };

export async function getAnalyticsOverview(
  token: string,
  request: AnalyticsOverviewRequest,
): Promise<AnalyticsOverview> {
  const query = new URLSearchParams();

  if ("range" in request) {
    query.set("range", request.range);
  } else {
    query.set("startDate", request.startDate);
    query.set("endDate", request.endDate);
  }

  if (request.teamId) query.set("teamId", request.teamId);
  if (request.channel) query.set("channel", request.channel);
  if (request.slaStatus) query.set("slaStatus", request.slaStatus);
  if (request.comparePrevious === false) query.set("comparePrevious", "false");

  return apiFetch<AnalyticsOverview>(`/analytics/overview?${query}`, { token });
}
