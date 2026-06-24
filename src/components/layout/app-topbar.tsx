"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Menu,
  Wifi,
  WifiOff,
} from "lucide-react";
import { logoutApi } from "@/api/auth";
import { useSocketConnection } from "@/hooks/use-socket-connection";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, { title: string; eyebrow: string }> = {
  "/inbox": {
    title: "Inbox",
    eyebrow: "Realtime customer conversations",
  },
  "/conversations": {
    title: "Conversations",
    eyebrow: "Conversation history and channels",
  },
  "/customers": {
    title: "Customers",
    eyebrow: "Profiles and contact context",
  },
  "/tickets": {
    title: "Tickets",
    eyebrow: "Support issues and ownership",
  },
  "/teams": {
    title: "Teams",
    eyebrow: "Workspace users and roles",
  },
  "/analytics": {
    title: "Analytics",
    eyebrow: "Operational reporting",
  },
  "/settings": {
    title: "Settings",
    eyebrow: "Workspace configuration",
  },
};

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

export function AppTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const clearSession = useAuthStore((s) => s.clearSession);
  const socketState = useSocketConnection();
  const page =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([href]) => href !== "/inbox" && pathname.startsWith(href),
    )?.[1] ??
    pageTitles["/inbox"];

  const logoutMut = useMutation({
    mutationFn: async () => {
      await logoutApi(token);
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
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-oc-border bg-oc-bg/95 px-3 backdrop-blur sm:px-4 lg:px-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 shrink-0 px-0 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="hidden text-xs font-medium text-oc-faint sm:block">
          {page.eyebrow}
        </p>
        <h1 className="truncate text-base font-semibold text-oc-text sm:text-lg">
          {page.title}
        </h1>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <ConnectionPill state={socketState} />

        <div className="hidden items-center gap-2 rounded-xl border border-oc-border bg-oc-panel px-3 py-2.5 xl:flex">
          <span className="text-xs font-medium text-oc-faint">
            Company
          </span>

          <span className="max-w-[180px] truncate text-sm font-semibold text-oc-text">
            {company?.name ?? "OmniCore"}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-oc-border bg-oc-panel px-2 py-1.5 sm:px-2.5">
          <Avatar src={user?.avatarUrl} name={display} size={32} />
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="max-w-[150px] truncate text-sm font-semibold text-oc-text">
              {display}
            </span>
            <span className="max-w-[150px] truncate text-xs text-oc-faint">
              {user?.email}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 px-0"
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
