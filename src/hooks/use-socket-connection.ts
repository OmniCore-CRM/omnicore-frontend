"use client";

import { startTransition, useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuthStore } from "@/stores/auth-store";

export type ConnectionState =
  | "offline"
  | "connecting"
  | "live"
  | "degraded";

export function useSocketConnection(): ConnectionState {
  const socket = useSocket();
  const token = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<ConnectionState>("offline");

  useEffect(() => {
    if (token && !socket) {
      startTransition(() => setState("connecting"));
      return;
    }
    if (!socket) {
      startTransition(() => setState("offline"));
      return;
    }

    const sync = () => {
      startTransition(() => {
        if (socket.connected) setState("live");
        else if (socket.active) setState("connecting");
        else setState("degraded");
      });
    };

    sync();
    socket.on("connect", sync);
    socket.on("disconnect", sync);
    socket.io.on("reconnect_attempt", sync);
    socket.io.on("reconnect", sync);
    socket.io.on("reconnect_error", sync);

    return () => {
      socket.off("connect", sync);
      socket.off("disconnect", sync);
      socket.io.off("reconnect_attempt", sync);
      socket.io.off("reconnect", sync);
      socket.io.off("reconnect_error", sync);
    };
  }, [socket, token]);

  return state;
}
