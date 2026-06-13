import { apiFetch } from "./client";
import type { AnalyticsOverview, AnalyticsRange } from "@/types/models";

export async function getAnalyticsOverview(
  token: string,
  range: AnalyticsRange,
): Promise<AnalyticsOverview> {
  const query = new URLSearchParams({ range });
  return apiFetch<AnalyticsOverview>(`/analytics/overview?${query}`, { token });
}
