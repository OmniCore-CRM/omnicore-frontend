"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attachTagToTarget,
  listTags,
  removeTagFromTarget,
  type TagTargetType,
} from "@/api/tags";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types/models";

type InvalidateKey = readonly unknown[];

export function TagPills({
  tags,
  empty = "No tags",
  className,
}: {
  tags?: Tag[];
  empty?: string;
  className?: string;
}) {
  if (!tags?.length) {
    return (
      <Badge tone="neutral" className={cn("normal-case", className)}>
        {empty}
      </Badge>
    );
  }

  return (
    <>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          tone="neutral"
          className={cn("gap-1.5 normal-case", className)}
        >
          {tag.color && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
          )}
          {tag.name}
        </Badge>
      ))}
    </>
  );
}

export function TagEditor({
  targetType,
  targetId,
  selectedTags,
  invalidateKeys,
  canMutate = true,
}: {
  targetType: TagTargetType;
  targetId: string;
  selectedTags?: Tag[];
  invalidateKeys: InvalidateKey[];
  canMutate?: boolean;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [selectedTagId, setSelectedTagId] = useState("");

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => listTags(token ?? ""),
    enabled: Boolean(token),
  });

  const selectedIds = useMemo(
    () => new Set((selectedTags ?? []).map((tag) => tag.id)),
    [selectedTags],
  );
  const availableTags = useMemo(
    () => (tagsQuery.data ?? []).filter((tag) => !selectedIds.has(tag.id)),
    [selectedIds, tagsQuery.data],
  );

  const invalidateTargets = async () => {
    await qc.invalidateQueries({ queryKey: ["tags"] });
    await Promise.all(
      invalidateKeys.map((key) => qc.invalidateQueries({ queryKey: key })),
    );
  };

  const attachMutation = useMutation({
    mutationFn: (tagId: string) =>
      attachTagToTarget(token ?? "", targetType, targetId, tagId),
    onSuccess: async () => {
      setSelectedTagId("");
      await invalidateTargets();
      toast.success("Tag added");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not add tag"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tagId: string) =>
      removeTagFromTarget(token ?? "", targetType, targetId, tagId),
    onSuccess: async () => {
      await invalidateTargets();
      toast.success("Tag removed");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not remove tag"));
    },
  });

  const busy = attachMutation.isPending || removeMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(selectedTags ?? []).length ? (
          selectedTags?.map((tag) => (
            <button
              key={tag.id}
              type="button"
              disabled={!canMutate || busy}
              onClick={() => removeMutation.mutate(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              className="inline-flex min-h-8 items-center gap-2 rounded-md border border-oc-border bg-oc-elevated px-2.5 py-1 text-xs font-medium text-oc-text transition-colors hover:bg-oc-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent disabled:pointer-events-none disabled:opacity-50"
            >
              {tag.color && (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              {tag.name}
              {canMutate && <span className="text-oc-faint">x</span>}
            </button>
          ))
        ) : (
          <span className="rounded-md border border-dashed border-oc-border bg-oc-bg/40 px-3 py-2 text-sm text-oc-muted">
            No tags yet.
          </span>
        )}
      </div>

      {canMutate && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor={`${targetType}-${targetId}-tag`}>
            Add tag
          </label>
          <select
            id={`${targetType}-${targetId}-tag`}
            value={selectedTagId}
            disabled={busy || tagsQuery.isLoading || !availableTags.length}
            onChange={(event) => setSelectedTagId(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {tagsQuery.isLoading
                ? "Loading tags..."
                : availableTags.length
                  ? "Choose a tag"
                  : "No available tags"}
            </option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!selectedTagId || busy}
            onClick={() => attachMutation.mutate(selectedTagId)}
          >
            Add tag
          </Button>
        </div>
      )}

      {tagsQuery.error && (
        <p className="text-xs text-red-300">
          {getErrorMessage(tagsQuery.error, "Could not load tags")}
        </p>
      )}
    </div>
  );
}
