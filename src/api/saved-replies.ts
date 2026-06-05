import { apiFetch } from "./client";
import type { SavedReply } from "@/types/models";

export interface SavedReplyInput {
  title: string;
  content: string;
}

export async function listSavedReplies(
  token: string,
  params: { search?: string } = {},
): Promise<SavedReply[]> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  const qs = q.toString();

  return apiFetch<SavedReply[]>(`/saved-replies${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
}

export async function createSavedReply(
  token: string,
  body: SavedReplyInput,
): Promise<SavedReply> {
  return apiFetch<SavedReply>("/saved-replies", {
    method: "POST",
    token,
    body,
  });
}

export async function updateSavedReply(
  token: string,
  replyId: string,
  body: Partial<SavedReplyInput>,
): Promise<SavedReply> {
  return apiFetch<SavedReply>(`/saved-replies/${replyId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function deleteSavedReply(
  token: string,
  replyId: string,
): Promise<SavedReply> {
  return apiFetch<SavedReply>(`/saved-replies/${replyId}`, {
    method: "DELETE",
    token,
  });
}
