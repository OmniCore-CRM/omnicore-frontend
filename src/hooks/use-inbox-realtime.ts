"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/constants/socket-events";
import { queryKeys } from "@/constants/query-keys";
import type { Message } from "@/types/models";

function extractMessage(payload: unknown): Message | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if ("conversationId" in o && "id" in o && "body" in o) {
    return o as unknown as Message;
  }
  if (o.message && typeof o.message === "object") {
    return o.message as Message;
  }
  return null;
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
    const onMessage = (payload: unknown) => {
      bumpLists();
      const m = extractMessage(payload);
      if (m?.conversationId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.messages(m.conversationId),
        });
      }
    };
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, bumpLists);
    socket.on(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onMessage);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, bumpLists);
      socket.off(SOCKET_EVENTS.INBOX_REFRESH, bumpLists);
    };
  }, [socket, qc]);
}
