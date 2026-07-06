import { apiFetch } from "./client";
import type { AssignmentCenterOverview } from "@/types/models";

export interface AssignmentCenterOverviewParams {
  listLimit?: number;
  recentLimit?: number;
}

export async function getAssignmentCenterOverview(
  token: string,
  params: AssignmentCenterOverviewParams = {},
): Promise<AssignmentCenterOverview> {
  const q = new URLSearchParams();
  if (params.listLimit) q.set("listLimit", String(params.listLimit));
  if (params.recentLimit) q.set("recentLimit", String(params.recentLimit));
  const qs = q.toString();

  return apiFetch<AssignmentCenterOverview>(
    `/assignment-center${qs ? `?${qs}` : ""}`,
    {
      token,
      cache: "no-store",
    },
  );
}
