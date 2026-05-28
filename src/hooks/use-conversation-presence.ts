"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/constants/socket-events";

export function useConversationPresence(conversationId: string | null) {
  const socket = useSocket();
  const [peerTyping, setPeerTyping] = useState(false);

  // Debounced typing lifecycle timers.
  const stopTypingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const onTyping = (payload: unknown) => {
      const o = payload as { conversationId?: string };
      if (o.conversationId === conversationId) setPeerTyping(true);
    };
    const onStop = (payload: unknown) => {
      const o = payload as { conversationId?: string };
      if (o.conversationId === conversationId) setPeerTyping(false);
    };

    socket.on(SOCKET_EVENTS.TYPING_START, onTyping);
    socket.on(SOCKET_EVENTS.TYPING_STOP, onStop);
    return () => {
      socket.off(SOCKET_EVENTS.TYPING_START, onTyping);
      socket.off(SOCKET_EVENTS.TYPING_STOP, onStop);
    };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!peerTyping) return;
    const t = window.setTimeout(() => setPeerTyping(false), 4000);
    return () => window.clearTimeout(t);
  }, [peerTyping]);

  const emitTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    // Emit typing start only once during active typing.
    if (!isTypingRef.current) {
      socket.emit(SOCKET_EVENTS.TYPING_START, {
        conversationId,
      });

      isTypingRef.current = true;
    }

    // Reset typing inactivity timer.
    if (stopTypingTimeoutRef.current) {
      window.clearTimeout(stopTypingTimeoutRef.current);
    }

    stopTypingTimeoutRef.current = window.setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, {
        conversationId,
      });

      isTypingRef.current = false;
    }, 1800);
  }, [socket, conversationId]);

  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current) {
        window.clearTimeout(stopTypingTimeoutRef.current);
      }
    };
  }, []);

  return { peerTyping, emitTyping };
}
