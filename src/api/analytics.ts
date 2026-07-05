import { apiFetch } from "./client";
import type {
  AnalyticsOverview,
  AnalyticsPresetRange,
} from "@/types/models";

export type AnalyticsOverviewRequest =
  | { range: AnalyticsPresetRange | "all" }
  | { startDate: string; endDate: string };

export async function getAnalyticsOverview(
  token: string,
  request: AnalyticsOverviewRequest,
): Promise<AnalyticsOverview> {
  const query = new URLSearchParams(
    "range" in request
      ? { range: request.range }
      : {
          startDate: request.startDate,
          endDate: request.endDate,
        },
  );
  return apiFetch<AnalyticsOverview>(`/analytics/overview?${query}`, { token });
}
