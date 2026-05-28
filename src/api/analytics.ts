import { apiFetch } from "./client";
import type { AnalyticsOverview } from "@/types/models";

export async function getAnalyticsOverview(
  token: string,
): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>("/analytics/overview", { token });
}
