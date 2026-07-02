"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConversation } from "@/api/conversations";
import { queryKeys } from "@/constants/query-keys";
import type { Paginated } from "@/types/api";
import type { Conversation } from "@/types/models";

function getConversationPlaceholderFromListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  const cachedPages = queryClient.getQueriesData<Paginated<Conversation>>({
    queryKey: ["conversations"],
  });

  for (const [, page] of cachedPages) {
    const match = page?.items?.find((item) => item.id === conversationId);
    if (match) return match;
  }

  return undefined;
}

export function useSelectedConversationQuery(
  token: string | null,
  selectedId: string | null,
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.conversation(selectedId ?? "_"),
    queryFn: () => getConversation(token!, selectedId!),
    enabled: Boolean(token && selectedId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    placeholderData: () =>
      selectedId
        ? getConversationPlaceholderFromListCache(queryClient, selectedId)
        : undefined,
  });
}