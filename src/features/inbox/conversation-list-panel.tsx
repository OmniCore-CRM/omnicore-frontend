"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "@/api/conversations";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format-time";
import type { ConversationChannel, Conversation } from "@/types/models";

function channelLabel(ch?: ConversationChannel) {
  if (!ch) return "Channel";
  return ch === "WHATSAPP" ? "WhatsApp" : ch;
}

function channelTone(ch?: ConversationChannel) {
  if (ch === "WHATSAPP") return "success" as const;
  if (ch === "EMAIL") return "accent" as const;
  return "neutral" as const;
}

export function ConversationListPanel() {
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
    <section className="flex h-full min-h-0 min-w-0 flex-col border-oc-border bg-oc-bg-mid md:w-[min(100%,380px)] md:shrink-0 md:border-r">
      <div className="border-b border-oc-border p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-oc-faint">
          Unified Inbox
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
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
                "rounded-md px-2 py-1 text-xs transition-colors",
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
          className="mt-3 h-9 text-sm"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}
        {error && (
          <p className="p-4 text-sm text-oc-danger">
            Could not load conversations. Check API URL and auth.
          </p>
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
          <p className="p-6 text-center text-sm text-oc-muted">
            No conversations match this view.
          </p>
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
  const name =
    customer?.firstName ||
    customer?.email ||
    customer?.phone ||
    "Customer";
  const preview = c.lastMessagePreview || "No messages yet";
  const unread = c.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full gap-3 border-b border-oc-border/60 px-3 py-3 text-left transition-colors hover:bg-oc-panel/80",
        active && "bg-oc-panel ring-1 ring-inset ring-violet-500/25",
      )}
    >
      <Avatar src={customer?.avatarUrl} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-oc-text">
            {name}
          </span>
          <span className="shrink-0 text-[11px] text-oc-faint">
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
            <span className="truncate text-[11px] text-oc-faint">
              {c.assignee.displayName || c.assignee.email}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-oc-muted">{preview}</p>
      </div>
      {unread > 0 && (
        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-oc-accent px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
