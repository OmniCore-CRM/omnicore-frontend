import { apiFetch } from "./client";
import type { ChannelProviderReadiness } from "@/types/models";

export async function getChannelProviderReadiness(
  token: string
): Promise<ChannelProviderReadiness> {
  return apiFetch<ChannelProviderReadiness>("/channels/readiness", { token });
}
