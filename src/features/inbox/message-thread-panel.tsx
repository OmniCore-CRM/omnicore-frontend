"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  getConversation,
  listMessages,
  patchConversation,
  sendMessage,
} from "@/api/conversations";
import { createTicketFromConversation, updateTicket } from "@/api/tickets";
import { listSavedReplies } from "@/api/saved-replies";
import { assignConversationTeam, listTeams } from "@/api/teams";
import {
  downloadAttachment,
  uploadConversationAttachment,
} from "@/api/attachments";
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
import { TagPills } from "@/features/tags/tag-editor";
import {
  formatFileSize,
  InlineAttachmentItem,
} from "@/features/attachments/attachment-list";
import { buildConversationTimeline } from "@/features/attachments/conversation-timeline";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type {
  Conversation,
  ConversationStatus,
  Message,
  SavedReply,
  Attachment,
} from "@/types/models";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Info,
  Loader2,
  Paperclip,
  Search,
  TicketCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
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

const conversationStatuses: ConversationStatus[] = [
  "OPEN",
  "PENDING",
  "RESOLVED",
  "SNOOZED",
];

function statusTone(status?: ConversationStatus) {
  if (status === "RESOLVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "SNOOZED") return "accent" as const;
  return "neutral" as const;
}

export function MessageThreadPanel({
  onBack,
  onOpenCustomer,
}: {
  onBack: () => void;
  onOpenCustomer: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketState = useSocketConnection();

  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.conversation(selectedId ?? "_"),
    queryFn: () => getConversation(token!, selectedId!),
    enabled: !!token && !!selectedId,
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const { peerTyping, emitTyping } = useConversationPresence(selectedId);
  useConversationRoom(selectedId);
  const lastTypingEmit = useRef(0);

  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(selectedId ?? "_"),
    queryFn: () => listMessages(token!, selectedId!, { limit: 80 }),
    enabled: !!token && !!selectedId,
    staleTime: 10_000,
  });

  const savedRepliesQuery = useQuery({
    queryKey: queryKeys.savedReplies(),
    queryFn: () => listSavedReplies(token!),
    enabled: !!token && !!selectedId,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token!),
    enabled: !!token && !!selectedId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    messagesQuery.data?.items,
    conversation?.attachments,
    selectedId,
    peerTyping,
  ]);

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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tickets"] }),
        qc.invalidateQueries({ queryKey: ["conversations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.conversation(selectedId!) }),
      ]);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create ticket"));
    },
  });

  const resolveTicketMut = useMutation({
    mutationFn: async (ticket: NonNullable<Conversation["primaryTicket"]>) => {
      if (ticket.status === "OPEN") {
        await updateTicket(token!, ticket.id, { status: "PENDING" });
      }
      return updateTicket(token!, ticket.id, { status: "RESOLVED" });
    },
    onSuccess: async (ticket) => {
      if (selectedId) {
        qc.setQueryData<Conversation>(
          queryKeys.conversation(selectedId),
          (current) =>
            current
              ? {
                  ...current,
                  primaryTicket:
                    current.primaryTicket?.id === ticket.id
                      ? { ...current.primaryTicket, ...ticket }
                      : current.primaryTicket,
                  tickets: current.tickets?.map((item) =>
                    item.id === ticket.id ? { ...item, ...ticket } : item,
                  ),
                }
              : current,
        );
      }
      toast.success("Ticket resolved");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tickets"] }),
        qc.invalidateQueries({ queryKey: ["conversations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.ticket(ticket.id) }),
      ]);
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not resolve ticket")),
  });

  const statusMut = useMutation({
    mutationFn: (status: ConversationStatus) =>
      patchConversation(token!, selectedId!, { status }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.conversation(updated.id), updated);
      qc.setQueriesData(
        { queryKey: ["conversations"] },
        (old: Paginated<Conversation> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          };
        },
      );
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`Conversation marked ${updated.status?.toLowerCase()}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not update conversation status"));
    },
  });
  const teamMut = useMutation({
    mutationFn: (teamId: string | null) =>
      assignConversationTeam(token!, selectedId!, teamId),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.conversation(updated.id), updated);
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: queryKeys.teams });
      toast.success("Conversation team updated");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update conversation team")),
  });

  const [draft, setDraft] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    conversationId: string;
    file: File;
  } | null>(null);
  const pendingAttachmentFile =
    pendingAttachment && pendingAttachment.conversationId === selectedId
      ? pendingAttachment.file
      : null;
  const [savedRepliesOpen, setSavedRepliesOpen] = useState(false);
  const [savedReplySearch, setSavedReplySearch] = useState("");

  const filteredSavedReplies = useMemo(() => {
    const replies = savedRepliesQuery.data ?? [];
    const needle = savedReplySearch.trim().toLowerCase();
    if (!needle) return replies;

    return replies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(needle) ||
        reply.content.toLowerCase().includes(needle),
    );
  }, [savedRepliesQuery.data, savedReplySearch]);

  const timeline = useMemo(
    () =>
      buildConversationTimeline(
        messagesQuery.data?.items ?? [],
        conversation?.attachments ?? [],
      ),
    [conversation?.attachments, messagesQuery.data?.items],
  );

  const uploadAttachmentMut = useMutation({
    mutationFn: (file: File) =>
      uploadConversationAttachment(token!, selectedId!, file),
    onSuccess: async () => {
      toast.success("Attachment uploaded");
      await qc.invalidateQueries({
        queryKey: queryKeys.conversation(selectedId!),
      });
      await qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not upload attachment")),
  });

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingAttachmentId(attachment.id);
    try {
      await downloadAttachment(token!, attachment);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not download attachment"));
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    const now = Date.now();
    if (now - lastTypingEmit.current > 1600) {
      lastTypingEmit.current = now;
      emitTyping();
    }
  };

  const submit = async () => {
    const text = draft.trim();
    const file = pendingAttachmentFile;

    if (
      (!text && !file) ||
      !selectedId ||
      sendMut.isPending ||
      uploadAttachmentMut.isPending
    ) {
      return;
    }

    setSavedRepliesOpen(false);
    if (text) setDraft("");

    try {
      if (text) {
        await sendMut.mutateAsync(text);
      }
      if (file) {
        await uploadAttachmentMut.mutateAsync(file);
        setPendingAttachment((current) =>
          current?.file === file ? null : current,
        );
      }
    } catch {
      // Individual mutations already surface safe error toasts.
    }
  };

  const insertSavedReply = (reply: SavedReply) => {
    setDraft((current) => {
      if (!current.trim()) return reply.content;
      return `${current.replace(/\s+$/u, "")}\n\n${reply.content}`;
    });
    setSavedRepliesOpen(false);
    setSavedReplySearch("");
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
  const linkedTicket = conversation?.primaryTicket ?? conversation?.tickets?.[0];
  const linkedTicketIsActive = Boolean(
    linkedTicket &&
      ["OPEN", "PENDING", "ESCALATED"].includes(linkedTicket.status),
  );

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
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-oc-border bg-oc-bg-mid/80 px-3 py-3 sm:px-4">
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
              <Badge
                tone={
                  conversation.channel === "WHATSAPP"
                    ? "success"
                    : conversation.channel === "EMAIL"
                      ? "accent"
                      : "neutral"
                }
                className="normal-case"
              >
                {conversation.channel}
              </Badge>
            )}
            <Badge tone={statusTone(conversation?.status)}>
              {conversation?.status ?? "OPEN"}
            </Badge>
            {conversation?.team && (
              <Badge tone="accent">{conversation.team.name}</Badge>
            )}
            <label className="sm:hidden">
              <span className="sr-only">Conversation team</span>
              <select
                aria-label="Conversation team mobile"
                value={conversation?.teamId ?? ""}
                onChange={(event) => teamMut.mutate(event.target.value || null)}
                disabled={teamMut.isPending || user?.role === "VIEWER"}
                className="h-8 max-w-[120px] rounded-lg border border-oc-border bg-oc-panel px-2 text-xs font-semibold text-oc-text outline-none focus-visible:ring-2 focus-visible:ring-oc-accent disabled:opacity-60"
              >
                <option value="">No team</option>
                {(teamsQuery.data ?? []).map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            {Boolean(conversation?.tags?.length) && (
              <TagPills tags={conversation?.tags} />
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
            {conversation?.channel === "EMAIL" && conversation.subject && (
              <span className="max-w-full truncate text-xs text-oc-muted">
                {conversation.subject}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap justify-end gap-1.5 max-sm:w-full max-sm:pl-12">
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
          {!linkedTicket && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-9 px-2.5 text-xs"
              disabled={createTicketMut.isPending}
              onClick={createTicket}
            >
              Create New Ticket
            </Button>
          )}
          {linkedTicket && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-9 px-2.5 text-xs"
              onClick={() => router.push(`/tickets?ticketId=${linkedTicket.id}`)}
            >
              View Ticket
            </Button>
          )}
          {linkedTicketIsActive && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="h-9 gap-1.5 px-2.5 text-xs"
              disabled={resolveTicketMut.isPending || user?.role === "VIEWER"}
              onClick={() => resolveTicketMut.mutate(linkedTicket!)}
            >
              {resolveTicketMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <TicketCheck className="h-3.5 w-3.5" />
              )}
              Resolve Ticket
            </Button>
          )}
          <label className="relative">
            <span className="sr-only">Conversation status</span>
            <select
              aria-label="Conversation status"
              value={conversation?.status ?? "OPEN"}
              onChange={(event) =>
                statusMut.mutate(event.target.value as ConversationStatus)
              }
              disabled={
                convLoading ||
                statusMut.isPending ||
                user?.role === "VIEWER"
              }
              className="h-9 max-w-[118px] cursor-pointer rounded-lg border border-oc-border bg-oc-panel px-2.5 text-xs font-semibold text-oc-text outline-none transition-colors hover:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-oc-accent disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-none"
            >
              {conversationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="relative hidden sm:block">
            <span className="sr-only">Conversation team</span>
            <select
              aria-label="Conversation team"
              value={conversation?.teamId ?? ""}
              onChange={(event) => teamMut.mutate(event.target.value || null)}
              disabled={teamMut.isPending || user?.role === "VIEWER"}
              className="h-9 max-w-[132px] cursor-pointer rounded-lg border border-oc-border bg-oc-panel px-2.5 text-xs font-semibold text-oc-text outline-none focus-visible:ring-2 focus-visible:ring-oc-accent disabled:opacity-60"
            >
              <option value="">No team</option>
              {(teamsQuery.data ?? []).map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
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
        ) : timeline.length ? (
          timeline.map((item) =>
            item.type === "message" ? (
              <MessageBubble key={`message-${item.id}`} message={item.message} />
            ) : (
              <InlineAttachmentItem
                key={`attachment-${item.id}`}
                attachment={item.attachment}
                downloadingId={downloadingAttachmentId}
                onDownload={handleDownload}
                align={
                  item.attachment.uploadedFrom === "AGENT" ? "right" : "left"
                }
              />
            ),
          )
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
        {savedRepliesOpen && (
          <div className="mb-3 max-h-[min(360px,45vh)] overflow-hidden rounded-xl border border-oc-border bg-oc-panel shadow-oc-card">
            <div className="border-b border-oc-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-oc-text">
                    Saved replies
                  </p>
                  <p className="mt-1 text-xs text-oc-muted">
                    Insert a reusable reply, then edit it before sending.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSavedRepliesOpen(false)}
                >
                  Close
                </Button>
              </div>
              <label className="relative mt-3 block">
                <span className="sr-only">Search saved replies</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oc-faint" />
                <input
                  value={savedReplySearch}
                  onChange={(event) => setSavedReplySearch(event.target.value)}
                  placeholder="Search title or content..."
                  className="h-10 w-full rounded-lg border border-oc-border bg-oc-bg px-9 text-sm text-oc-text placeholder:text-oc-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                />
              </label>
            </div>
            <div className="max-h-[240px] overflow-y-auto p-2">
              {savedRepliesQuery.isLoading && (
                <p className="p-3 text-sm text-oc-muted">
                  Loading saved replies...
                </p>
              )}
              {savedRepliesQuery.error && (
                <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-200">
                  {getErrorMessage(
                    savedRepliesQuery.error,
                    "Could not load saved replies",
                  )}
                </p>
              )}
              {!savedRepliesQuery.isLoading &&
                !savedRepliesQuery.error &&
                filteredSavedReplies.length === 0 && (
                  <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                    {savedReplySearch.trim()
                      ? "No saved replies match your search."
                      : "No saved replies yet."}
                  </p>
                )}
              {filteredSavedReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => insertSavedReply(reply)}
                  className="mb-2 block w-full rounded-lg border border-oc-border/60 bg-oc-bg/50 p-3 text-left transition-colors last:mb-0 hover:bg-oc-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                >
                  <span className="block truncate text-sm font-semibold text-oc-text">
                    {reply.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block whitespace-pre-wrap text-sm leading-5 text-oc-muted">
                    {reply.content}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {pendingAttachmentFile && (
          <div className="mb-3 flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-oc-border bg-oc-panel/55 p-3">
            <Paperclip className="h-4 w-4 shrink-0 text-oc-faint" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-oc-text">
                {pendingAttachmentFile.name}
              </p>
              <p className="text-xs text-oc-muted">
                {formatFileSize(pendingAttachmentFile.size)} selected. Send to upload.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPendingAttachment(null)}
              disabled={uploadAttachmentMut.isPending}
            >
              Remove
            </Button>
          </div>
        )}
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
            <label
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-oc-border bg-transparent px-3 text-sm font-medium text-oc-text transition-colors hover:bg-oc-panel focus-within:outline focus-within:outline-2 focus-within:outline-oc-accent"
              title="Upload attachment"
            >
              {uploadAttachmentMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">File</span>
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
                disabled={uploadAttachmentMut.isPending || user?.role === "VIEWER"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && selectedId) {
                    setPendingAttachment({ conversationId: selectedId, file });
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <Button
              type="button"
              variant={savedRepliesOpen ? "secondary" : "outline"}
              size="sm"
              className="h-10 px-3"
              onClick={() => setSavedRepliesOpen((open) => !open)}
              title="Open saved replies"
            >
              <span className="hidden sm:inline">Replies</span>
              <span className="sm:hidden">Reply</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-10 px-4"
              onClick={submit}
              disabled={
                sendMut.isPending ||
                uploadAttachmentMut.isPending ||
                (!draft.trim() && !pendingAttachmentFile)
              }
            >
              {sendMut.isPending || uploadAttachmentMut.isPending ? (
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
        {message.provider === "EMAIL" && message.metadata && (
          <div
            className={cn(
              "mb-2 space-y-0.5 border-b pb-2 text-xs",
              outbound
                ? "border-violet-300/25 text-violet-100/85"
                : "border-oc-border text-oc-muted",
            )}
          >
            {message.metadata.subject && (
              <p className="truncate font-medium">{message.metadata.subject}</p>
            )}
            <p className="truncate">
              {message.metadata.from ? `From ${message.metadata.from}` : ""}
              {message.metadata.to?.length
                ? `${message.metadata.from ? " · " : ""}To ${message.metadata.to.join(", ")}`
                : ""}
            </p>
          </div>
        )}
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
