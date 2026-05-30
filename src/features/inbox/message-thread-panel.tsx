"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  getConversation,
  listMessages,
  sendMessage,
} from "@/api/conversations";
import { createTicketFromConversation } from "@/api/tickets";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useConversationPresence } from "@/hooks/use-conversation-presence";
import { useConversationRoom } from "@/hooks/use-conversation-room";
import { useSocketConnection } from "@/hooks/use-socket-connection";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { Message } from "@/types/models";
import { ArrowLeft, Check, CheckCheck, Info, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

function isOptimisticMatch(candidate: Message, incoming: Message) {
  if (!candidate.id.startsWith("temp-")) return false;
  if (candidate.conversationId !== incoming.conversationId) return false;
  if (candidate.sender !== incoming.sender) return false;
  if (candidate.content !== incoming.content) return false;

  const candidateTime = new Date(candidate.createdAt).getTime();
  const incomingTime = new Date(incoming.createdAt).getTime();

  if (!Number.isFinite(candidateTime) || !Number.isFinite(incomingTime)) {
    return true;
  }

  return Math.abs(candidateTime - incomingTime) <= 30_000;
}

function reconcileMessage(
  page: Paginated<Message> | undefined,
  message: Message,
) {
  const base = page ?? { items: [] as Message[] };
  const exists = base.items.some((item) => item.id === message.id);
  const matchingOptimistic = base.items.find((item) =>
    isOptimisticMatch(item, message),
  );

  if (exists) {
    return {
      ...base,
      items: base.items.map((item) =>
        item.id === message.id ? { ...item, ...message } : item,
      ),
    };
  }

  if (matchingOptimistic) {
    return {
      ...base,
      items: base.items.map((item) =>
        item.id === matchingOptimistic.id ? { ...item, ...message } : item,
      ),
    };
  }

  return {
    ...base,
    items: [...base.items, message],
  };
}

export function MessageThreadPanel({
  onBack,
  onOpenCustomer,
}: {
  onBack: () => void;
  onOpenCustomer: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketState = useSocketConnection();

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
        status: "PENDING",
      };
      qc.setQueryData(
        queryKeys.messages(selectedId),
        (old: Paginated<Message> | undefined) => {
          const base = old ?? { items: [] as Message[] };
          return { ...base, items: [...base.items, optimistic] };
        },
      );
      return { optimistic, prev };
    },
    onSuccess: (message) => {
      if (!selectedId) return;
      qc.setQueryData(
        queryKeys.messages(selectedId),
        (old: Paginated<Message> | undefined) =>
          reconcileMessage(old, message),
      );
    },
    onError: (err, _text, ctx) => {
      toast.error(
        getErrorMessage(err, "Message could not be sent"),
      );
      if (!selectedId || !ctx?.optimistic) return;

      const current = qc.getQueryData<Paginated<Message>>(
        queryKeys.messages(selectedId),
      );
      const failedServerMessage = current?.items.some(
        (item) =>
          item.id !== ctx.optimistic.id &&
          item.status === "FAILED" &&
          isOptimisticMatch(ctx.optimistic, item),
      );

      if (failedServerMessage) return;

      qc.setQueryData(
        queryKeys.messages(selectedId),
        (old: Paginated<Message> | undefined) => {
          const base = old ?? { items: [] as Message[] };
          const hasOptimistic = base.items.some(
            (item) => item.id === ctx.optimistic.id,
          );

          if (!hasOptimistic) {
            return {
              ...base,
              items: [
                ...base.items,
                {
                  ...ctx.optimistic,
                  status: "FAILED",
                },
              ],
            };
          }

          return {
            ...base,
            items: base.items.map((item) =>
              item.id === ctx.optimistic.id
                ? { ...item, status: "FAILED" }
                : item,
            ),
          };
        },
      );
    },
    onSettled: () => {
      if (!selectedId) return;
      void qc.invalidateQueries({ queryKey: queryKeys.messages(selectedId) });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const createTicketMut = useMutation({
    mutationFn: (subject: string) =>
      createTicketFromConversation(token!, selectedId!, {
        subject,
        priority: "MEDIUM",
      }),
    onSuccess: async (ticket) => {
      toast.success(`Ticket created: ${ticket.subject}`);
      await qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create ticket"));
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
      <section className="hidden min-h-0 flex-1 flex-col items-center justify-center bg-oc-bg/40 p-8 text-center md:flex">
        <div className="max-w-sm rounded-xl border border-dashed border-oc-border bg-oc-panel/30 p-8">
          <p className="text-base font-semibold text-oc-text">
            Select a conversation
          </p>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            Open a thread to view messages, delivery states, customer context,
            and realtime updates.
          </p>
        </div>
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

  const createTicket = () => {
    if (!selectedId || createTicketMut.isPending) return;
    const subject = window.prompt(
      "Ticket subject",
      customerName ? `Follow up with ${customerName}` : "Customer follow-up",
    );

    if (!subject?.trim()) return;
    createTicketMut.mutate(subject.trim());
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-oc-bg/30">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-oc-border bg-oc-bg-mid/80 px-3 py-3 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="h-10 w-10 shrink-0 px-0 md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-oc-text">
            {title}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            {conversation?.channel && (
              <Badge tone={conversation.channel === "WHATSAPP" ? "success" : "neutral"} className="normal-case">
                {conversation.channel}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-oc-faint">
              {socketState === "live" ? (
                <Wifi className="h-3.5 w-3.5 text-oc-success" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-oc-warning" />
              )}
              {socketState === "live"
                ? "Live"
                : socketState === "offline"
                  ? "Offline"
                  : "Reconnecting"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-10 w-10 px-0 xl:hidden"
            onClick={onOpenCustomer}
            aria-label="Open customer details"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={createTicketMut.isPending}
            onClick={createTicket}
          >
            <span className="hidden sm:inline">Ticket</span>
            <span className="sm:hidden">Tkt</span>
          </Button>
          <Button variant="secondary" size="sm" type="button" disabled className="hidden sm:inline-flex">
            Resolve
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6">
        {convLoading || messagesQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-16 rounded-xl",
                  i % 2 ? "ml-auto w-[68%]" : "w-[76%]",
                )}
              />
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

      <footer className="shrink-0 border-t border-oc-border bg-oc-bg-mid/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        <div className="flex items-end gap-2 sm:gap-3">
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
            className="max-h-36 min-h-[64px] flex-1 resize-none text-sm leading-6"
            disabled={sendMut.isPending}
          />
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-10 px-3 sm:inline-flex"
              disabled
              title="TODO: attachments pipeline"
            >
              +
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-10 px-4"
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
        <p className="mt-2 hidden text-xs text-oc-faint sm:block">
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
          "max-w-[min(88%,560px)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ring-1 sm:max-w-[min(78%,600px)]",
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
            "mt-2 flex items-center justify-end gap-1.5 text-xs",
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
  if (state === "PENDING") {
    return <Loader2 className="h-3 w-3 animate-spin opacity-80" />;
  }
  if (state === "FAILED") {
    return <span className="text-[10px] font-medium">Failed</span>;
  }
  if (state === "READ") {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-200" />;
  }
  if (state === "DELIVERED" || state === "SENT") {
    return <CheckCheck className="h-3.5 w-3.5 opacity-80" />;
  }
  return <Check className="h-3.5 w-3.5 opacity-80" />;
}
