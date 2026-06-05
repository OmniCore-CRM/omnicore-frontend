import { apiFetch } from "./client";
import type { Tag } from "@/types/models";

export interface TagListParams {
  search?: string;
}

export interface TagInput {
  name: string;
  color?: string | null;
}

export type TagTargetType = "customers" | "conversations" | "tickets";

export async function listTags(
  token: string,
  params: TagListParams = {},
): Promise<Tag[]> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  const qs = q.toString();
  return apiFetch<Tag[]>(`/tags${qs ? `?${qs}` : ""}`, {
    token,
    cache: "no-store",
  });
}

export async function createTag(
  token: string,
  body: TagInput,
): Promise<Tag> {
  return apiFetch<Tag>("/tags", {
    method: "POST",
    token,
    body,
  });
}

export async function updateTag(
  token: string,
  id: string,
  body: Partial<TagInput>,
): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function deleteTag(token: string, id: string): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function attachTagToTarget(
  token: string,
  targetType: TagTargetType,
  targetId: string,
  tagId: string,
): Promise<Tag> {
  return apiFetch<Tag>(`/${targetType}/${targetId}/tags`, {
    method: "POST",
    token,
    body: { tagId },
  });
}

export async function removeTagFromTarget(
  token: string,
  targetType: TagTargetType,
  targetId: string,
  tagId: string,
): Promise<Tag> {
  return apiFetch<Tag>(`/${targetType}/${targetId}/tags/${tagId}`, {
    method: "DELETE",
    token,
  });
}
