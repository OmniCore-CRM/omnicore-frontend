"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  LogOut,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { logoutApi } from "@/api/auth";
import { useSocketConnection } from "@/hooks/use-socket-connection";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ConnectionPill({ state }: { state: ReturnType<typeof useSocketConnection> }) {
  const label =
    state === "live"
      ? "Live"
      : state === "connecting"
        ? "Connecting"
        : state === "degraded"
          ? "Reconnecting"
          : "Offline";
  const tone =
    state === "live"
      ? "success"
      : state === "offline"
        ? "neutral"
        : "warning";
  return (
    <Badge tone={tone} className="gap-1 normal-case tracking-normal">
      {state === "live" ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

export function AppTopbar() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const globalSearch = useUiStore((s) => s.globalSearch);
  const setGlobalSearch = useUiStore((s) => s.setGlobalSearch);
  const socketState = useSocketConnection();

  const logoutMut = useMutation({
    mutationFn: async () => {
      if (token) await logoutApi(token);
    },
    onSettled: () => {
      clearSession();
      qc.clear();
      router.replace("/login");
    },
  });

  const display =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Agent";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-oc-border bg-oc-bg px-4">
      <div className="relative min-w-[120px] max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oc-faint" />
        <Input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search customers, conversations, tickets…"
          className="h-9 pl-9 text-sm"
          aria-label="Global search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ConnectionPill state={socketState} />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 px-2 text-oc-faint"
          type="button"
          disabled
        >
          <Bell className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-2 rounded-lg border border-oc-border bg-oc-panel px-3 py-2 md:flex">
          <span className="text-[11px] uppercase tracking-wide text-oc-faint">
            Company
          </span>

          <span className="text-xs font-medium text-oc-text">
            {useAuthStore((s) => s.company?.name) ?? "OmniCore"}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-oc-border bg-oc-panel px-2 py-1">
          <Avatar src={user?.avatarUrl} name={display} size={28} />
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="max-w-[140px] truncate text-xs font-medium text-oc-text">
              {display}
            </span>
            <span className="max-w-[140px] truncate text-[11px] text-oc-faint">
              {user?.email}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => logoutMut.mutate()}
            disabled={logoutMut.isPending}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
