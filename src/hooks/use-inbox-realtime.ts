"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/constants/socket-events";
import { queryKeys } from "@/constants/query-keys";
import type { Attachment, Conversation, Message } from "@/types/models";

type MessagePage = {
  items: Message[];
  nextCursor?: string | null;
  total?: number;
};

function extractMessage(payload: unknown): Message | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if ("conversationId" in o && "id" in o && "content" in o) {
    return o as unknown as Message;
  }
  if (o.message && typeof o.message === "object") {
    return o.message as Message;
  }
  return null;
}

function extractConversation(payload: unknown): Conversation | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if ("id" in value && "customerId" in value && "channel" in value) {
    return value as unknown as Conversation;
  }
  if (value.conversation && typeof value.conversation === "object") {
    return value.conversation as Conversation;
  }
  return null;
}

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

export function useInboxRealtime(companyId: string | null) {
  const socket = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket || !companyId) return;
    // Backend conversation room joining exists,
    // but company-wide inbox rooms are not implemented yet.
    // Keep the socket connected for realtime message events.
  }, [socket, companyId]);

  useEffect(() => {
    if (!socket) return;
    const bumpLists = () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    };
    const upsertMessage = (message: Message) => {
      qc.setQueryData(
        queryKeys.messages(message.conversationId),
        (old: MessagePage | undefined) => {
          if (!old) return old;

          const matchingOptimistic = old.items.find((item) =>
            isOptimisticMatch(item, message),
          );
          const exists = old.items.some((item) => item.id === message.id);
          const items = exists
            ? old.items.map((item) =>
                item.id === message.id ? { ...item, ...message } : item,
              )
            : matchingOptimistic
              ? old.items.map((item) =>
                  item.id === matchingOptimistic.id
                    ? { ...item, ...message }
                    : item,
                )
            : [...old.items, message];

          return { ...old, items };
        },
      );
    };
    const onMessage = (payload: unknown) => {
      bumpLists();
      const m = extractMessage(payload);
      if (m?.conversationId) {
        upsertMessage(m);
      }
    };
    const onStatusUpdated = (payload: unknown) => {
      const m = extractMessage(payload);
      if (!m?.conversationId) return;
      upsertMessage(m);
    };
    const onConversationUpdated = (payload: unknown) => {
      const conversation = extractConversation(payload);
      if (conversation) {
        qc.setQueryData(queryKeys.conversation(conversation.id), conversation);
        qc.setQueriesData(
          { queryKey: ["conversations"] },
          (old: { items: Conversation[] } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((item) =>
                item.id === conversation.id
                  ? { ...item, ...conversation }
                  : item,
              ),
            };
          },
        );
      }
      bumpLists();
    };
    const onAttachmentCreated = (payload: unknown) => {
      const attachment = payload as Attachment | undefined;
      if (attachment?.conversationId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.conversation(attachment.conversationId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.messages(attachment.conversationId),
        });
      }
      bumpLists();
    };
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, onStatusUpdated);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
    socket.on("attachment_created", onAttachmentCreated);
    socket.on(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, onStatusUpdated);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
      socket.off("attachment_created", onAttachmentCreated);
      socket.off(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    };
  }, [socket, qc]);
}
