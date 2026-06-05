"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listConversations, listMessages } from "@/api/conversations";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format-time";
import type { ConversationChannel, Conversation, Message } from "@/types/models";

function channelLabel(ch?: ConversationChannel) {
  if (!ch) return "Channel";
  return ch === "WHATSAPP" ? "WhatsApp" : ch;
}

function channelTone(ch?: ConversationChannel) {
  if (ch === "WHATSAPP") return "success" as const;
  if (ch === "EMAIL") return "accent" as const;
  return "neutral" as const;
}

function isMeaningfulPreview(value?: string | null) {
  return Boolean(value?.trim());
}

function hasActivityAfterCreation(c: Conversation) {
  if (!c.updatedAt || !c.createdAt) return Boolean(c.updatedAt);

  const updatedAt = new Date(c.updatedAt).getTime();
  const createdAt = new Date(c.createdAt).getTime();

  if (!Number.isFinite(updatedAt) || !Number.isFinite(createdAt)) {
    return Boolean(c.updatedAt);
  }

  return updatedAt > createdAt + 1000;
}

function getConversationPreview(
  c: Conversation,
  fetchedMessages?: Message[],
  loadingMessages?: boolean,
) {
  if (isMeaningfulPreview(c.lastMessagePreview)) {
    return c.lastMessagePreview!.trim();
  }

  const latestMessage =
    c.latestMessage ||
    c.lastMessage ||
    (Array.isArray(c.messages) && c.messages.length
      ? c.messages[c.messages.length - 1]
      : null);

  if (isMeaningfulPreview(latestMessage?.content)) {
    return latestMessage!.content.trim();
  }

  const fetchedLatestMessage = fetchedMessages?.[fetchedMessages.length - 1];

  if (isMeaningfulPreview(fetchedLatestMessage?.content)) {
    return fetchedLatestMessage!.content.trim();
  }

  if (c.subject?.trim()) {
    return c.subject.trim();
  }

  if (loadingMessages) {
    return `${channelLabel(c.channel)} conversation loading preview`;
  }

  if (hasActivityAfterCreation(c)) {
    return `${channelLabel(c.channel)} conversation updated ${
      c.updatedAt ? formatRelative(c.updatedAt) : "recently"
    }`;
  }

  return "No messages yet";
}

export function ConversationListPanel({ selected }: { selected: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const inboxSearch = useInboxStore((s) => s.inboxSearch);
  const setInboxSearch = useInboxStore((s) => s.setInboxSearch);
  const inboxFilter = useInboxStore((s) => s.inboxFilter);
  const setInboxFilter = useInboxStore((s) => s.setInboxFilter);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const setSelectedId = useInboxStore((s) => s.setSelectedConversationId);

  const apiParams = useMemo(
    () => ({
      search: inboxSearch || undefined,
      channel: inboxFilter === "all" ? undefined : inboxFilter,
    }),
    [inboxSearch, inboxFilter],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.conversations(
      Object.fromEntries(
        Object.entries(apiParams).map(([k, v]) => [k, v ?? ""]),
      ),
    ),
    queryFn: () => listConversations(token!, apiParams),
    enabled: !!token,
    select: (page) => {
      let items = page.items;
      items = [...items].sort((a, b) => {
        const ta = new Date(
          a.lastMessageAt || a.updatedAt || a.createdAt || 0,
        ).getTime();
        const tb = new Date(
          b.lastMessageAt || b.updatedAt || b.createdAt || 0,
        ).getTime();
        return tb - ta;
      });
      return { ...page, items };
    },
  });

  return (
    <section
      className={cn(
        "h-full min-h-0 min-w-0 flex-col border-oc-border bg-oc-bg-mid/90 md:flex md:w-[330px] md:shrink-0 md:border-r xl:w-[380px]",
        selected ? "hidden md:flex" : "flex flex-1",
      )}
    >
      <div className="shrink-0 border-b border-oc-border p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
              Unified Inbox
            </p>
            <h2 className="mt-1 text-lg font-semibold text-oc-text">
              Conversations
            </h2>
          </div>
          {data?.items.length ? (
            <span className="rounded-full border border-oc-border bg-oc-panel px-2.5 py-1 text-xs font-medium text-oc-muted">
              {data.items.length}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["WHATSAPP", "WhatsApp"],
              ["EMAIL", "Email"],
              ["WEBSITE", "Website"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setInboxFilter(key)}
              className={cn(
                "min-h-8 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
                inboxFilter === key
                  ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/35"
                  : "text-oc-muted hover:bg-oc-panel hover:text-oc-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          value={inboxSearch}
          onChange={(e) => setInboxSearch(e.target.value)}
          placeholder="Search conversations…"
          className="mt-3 h-10 text-sm"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            Could not load conversations. Check API URL and auth.
          </div>
        )}
        {data?.items.map((c: Conversation) => (
          <ConversationRow
            key={c.id}
            c={c}
            active={c.id === selectedId}
            onSelect={() => setSelectedId(c.id)}
          />
        ))}
        {!isLoading && !error && data?.items.length === 0 && (
          <div className="m-2 rounded-lg border border-dashed border-oc-border bg-oc-panel/30 p-6 text-center">
            <p className="text-sm font-medium text-oc-text">
              No conversations here
            </p>
            <p className="mt-1 text-sm text-oc-muted">
              Website widget and WhatsApp conversations will appear here when
              customers message you.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ConversationRow({
  c,
  active,
  onSelect,
}: {
  c: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  const customer = c.customer;
  const token = useAuthStore((s) => s.accessToken);
  const name =
    customer?.firstName ||
    customer?.email ||
    customer?.phone ||
    "Customer";
  const needsMessagePreview =
    !c.lastMessagePreview &&
    !c.latestMessage &&
    !c.lastMessage &&
    !c.messages?.length;
  const { data: messagePage, isLoading: previewLoading } = useQuery({
    queryKey: queryKeys.messages(c.id),
    queryFn: () => listMessages(token!, c.id, { limit: 80 }),
    enabled: !!token && needsMessagePreview,
    staleTime: 30_000,
  });
  const preview = getConversationPreview(
    c,
    messagePage?.items,
    needsMessagePreview && previewLoading,
  );
  const unread = c.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "mb-2 flex w-full gap-3 rounded-xl border border-oc-border/60 bg-oc-bg-mid/60 px-3 py-3 text-left transition-colors hover:bg-oc-panel/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
        active && "bg-oc-panel ring-1 ring-inset ring-violet-500/35",
      )}
    >
      <Avatar src={customer?.avatarUrl} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-oc-text">
            {name}
          </span>
          <span className="shrink-0 text-xs text-oc-faint">
            {c.lastMessageAt || c.updatedAt
              ? formatRelative(c.lastMessageAt || c.updatedAt || "")
              : ""}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge tone={channelTone(c.channel)} className="normal-case">
            {channelLabel(c.channel)}
          </Badge>
          {c.assignee && (
            <span className="truncate text-xs text-oc-faint">
              {c.assignee.displayName || c.assignee.email}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-oc-muted">
          {preview}
        </p>
      </div>
      {unread > 0 && (
        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-oc-accent px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
