"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/constants/socket-events";
import { queryKeys } from "@/constants/query-keys";
import type { Message } from "@/types/models";

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
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, onStatusUpdated);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, bumpLists);
    socket.on(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, onStatusUpdated);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, bumpLists);
      socket.off(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    };
  }, [socket, qc]);
}
