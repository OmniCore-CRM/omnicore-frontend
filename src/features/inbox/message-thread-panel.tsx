"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  getConversation,
  listMessages,
  sendMessage,
} from "@/api/conversations";
import { queryKeys } from "@/constants/query-keys";
import { useConversationPresence } from "@/hooks/use-conversation-presence";
import { useConversationRoom } from "@/hooks/use-conversation-room";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { Message } from "@/types/models";
import { Check, CheckCheck, Loader2 } from "lucide-react";

export function MessageThreadPanel() {
  const token = useAuthStore((s) => s.accessToken);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.conversation(selectedId ?? "_"),
    queryFn: () => getConversation(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  const qc = useQueryClient();
  const { peerTyping, emitTyping } = useConversationPresence(selectedId);
  useConversationRoom(selectedId);
  const lastTypingEmit = useRef(0);

  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(selectedId ?? "_"),
    queryFn: () => listMessages(token!, selectedId!, { limit: 80 }),
    enabled: !!token && !!selectedId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.items, selectedId, peerTyping]);

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      sendMessage(token!, selectedId!, { content }),
    onMutate: async (text: string) => {
      if (!selectedId) return;
      await qc.cancelQueries({
        queryKey: queryKeys.messages(selectedId),
      });
      const prev = qc.getQueryData<{ items: Message[]; nextCursor?: string | null }>(
        queryKeys.messages(selectedId),
      );
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        conversationId: selectedId,
        content: text,
        sender: "AGENT",
        createdAt: new Date().toISOString(),
        status: "SENT",
      };
      qc.setQueryData(
        queryKeys.messages(selectedId),
        (old: Paginated<Message> | undefined) => {
          const base = old ?? { items: [] as Message[] };
          return { ...base, items: [...base.items, optimistic] };
        },
      );
      return { prev };
    },
    onError: (_err, _text, ctx) => {
      if (!selectedId || !ctx?.prev) return;
      qc.setQueryData(queryKeys.messages(selectedId), ctx.prev);
    },
    onSettled: () => {
      if (!selectedId) return;
      void qc.invalidateQueries({ queryKey: queryKeys.messages(selectedId) });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const [draft, setDraft] = useState("");

  const onDraftChange = (v: string) => {
    setDraft(v);
    const now = Date.now();
    if (now - lastTypingEmit.current > 1600) {
      lastTypingEmit.current = now;
      emitTyping();
    }
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || !selectedId || sendMut.isPending) return;
    sendMut.mutate(text);
    setDraft("");
  };

  if (!selectedId) {
    return (
      <section className="flex min-h-[320px] flex-1 flex-col items-center justify-center bg-oc-bg/40 p-8 text-center md:min-h-0">
        <p className="max-w-sm text-sm text-oc-muted">
          Select a conversation to view messages, delivery states, and realtime
          updates.
        </p>
      </section>
    );
  }

  const customerName = [
    conversation?.customer?.firstName,
    conversation?.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const title =
    customerName ||
    conversation?.customer?.email ||
    "Conversation";

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-oc-bg/30">
      <header className="flex items-center justify-between gap-3 border-b border-oc-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-oc-text">{title}</p>
          <p className="truncate text-[11px] text-oc-faint">
            {conversation?.channel
              ? `${conversation.channel} · `
              : ""}
            Active conversation
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" type="button" disabled>
            Assign
          </Button>
          <Button variant="secondary" size="sm" type="button" disabled>
            Resolve
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {convLoading || messagesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-[80%] rounded-xl" />
            ))}
          </div>
        ) : messagesQuery.data?.items.length ? (
          messagesQuery.data.items.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-oc-text">
                No messages yet
              </p>

              <p className="mt-1 text-sm text-oc-muted">
                Start the conversation by sending your first reply.
              </p>
            </div>
          </div>
        )}
        {peerTyping && (
          <div className="flex items-center gap-2 text-xs text-oc-muted">
            <span className="flex gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-oc-muted [animation-delay:-0.2s]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-oc-muted [animation-delay:-0.1s]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-oc-muted" />
            </span>
            Customer is typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-oc-border bg-oc-bg-mid/80 p-3">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends message.
              // Shift + Enter inserts newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a reply…"
            className="min-h-[72px] flex-1 text-sm"
            disabled={sendMut.isPending}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2"
              disabled
              title="TODO: attachments pipeline"
            >
              +
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-9 px-3"
              onClick={submit}
              disabled={sendMut.isPending || !draft.trim()}
            >
              {sendMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-oc-faint">
          Press Enter to send • Shift + Enter for newline.
        </p>
      </footer>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.sender === "AGENT";
  const pending = message.id.startsWith("temp-");
  return (
    <div
      className={cn(
        "flex w-full",
        outbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,520px)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ring-1",
          outbound
            ? "rounded-br-md bg-violet-600/90 text-white ring-violet-400/30"
            : "rounded-bl-md bg-oc-panel text-oc-text ring-oc-border",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            outbound ? "text-violet-100/90" : "text-oc-faint",
          )}
        >
          <span>
            {message.createdAt
              ? format(new Date(message.createdAt), "HH:mm")
              : ""}
          </span>
          {outbound && (
            <DeliveryTick state={message.status} pending={pending} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryTick({
  state,
  pending,
}: {
  state?: Message["status"];
  pending?: boolean;
}) {
  if (pending) {
    return <Loader2 className="h-3 w-3 animate-spin opacity-80" />;
  }
  if (state === "READ") {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-200" />;
  }
  if (state === "DELIVERED" || state === "SENT") {
    return <CheckCheck className="h-3.5 w-3.5 opacity-80" />;
  }
  return <Check className="h-3.5 w-3.5 opacity-80" />;
}
