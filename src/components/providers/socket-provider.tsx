"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";

export type SocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

const SocketContext = createContext<Socket | null>(null);
const SocketStatusContext = createContext<SocketStatus>("disconnected");

export function useSocket() {
  return useContext(SocketContext);
}

export function useSocketStatus() {
  return useContext(SocketStatusContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] =
    useState<SocketStatus>("disconnected");

  useEffect(() => {
    if (!token) {
      setStatus("disconnected");
      startTransition(() => {
        setSocket((prev) => {
          prev?.removeAllListeners();
          prev?.disconnect();
          return null;
        });
      });
      return;
    }

    const s = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 25,
      reconnectionDelay: 600,
      reconnectionDelayMax: 8000,
    });

    setStatus("connecting");

    s.on("connect", () => {
      setStatus("connected");
    });

    s.on("disconnect", () => {
      setStatus("disconnected");
    });

    s.io.on("reconnect_attempt", () => {
      setStatus("reconnecting");
    });

    s.io.on("reconnect", () => {
      setStatus("connected");
    });

    startTransition(() => setSocket(s));
    return () => {
      setStatus("disconnected");
      s.removeAllListeners();
      s.disconnect();
      startTransition(() => setSocket(null));
    };
  }, [token]);

  const value = useMemo(() => socket, [socket]);
  const statusValue = useMemo(() => status, [status]);
  return (
    <SocketStatusContext.Provider value={statusValue}>
      <SocketContext.Provider value={value}>
        {children}
      </SocketContext.Provider>
    </SocketStatusContext.Provider>
  );
}
