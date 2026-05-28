"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/constants/socket-events";

/**
 * Hook to manage conversation room subscription on the Socket.IO server.
 * When conversationId changes, it notifies the server to join the relevant room.
 */
export function useConversationRoom(conversationId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  }, [socket, conversationId]);
}
