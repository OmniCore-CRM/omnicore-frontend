"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshSessionApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { isTokenExpired } from "@/lib/jwt";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    // If we already have a valid token, render immediately
    // and trigger refresh in background
    if (accessToken && !isTokenExpired(accessToken)) {
      // Trigger background refresh without blocking
      // This ensures next navigation has a fresh token
      refreshSessionApi().catch(() => {
        // Ignore background refresh failures
        // We'll handle actual refresh errors when needed
      });
      return;
    }

    // If token is expired or missing, block and refresh
    if (refreshFailed) return;

    let cancelled = false;
    refreshSessionApi()
      .then((session) => {
        if (cancelled) return;
        setSession(session);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setRefreshFailed(true);
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, hasHydrated, refreshFailed, router, setSession]);

  // Show loading only if we haven't hydrated yet or we're actively refreshing
  // (not just because token is missing - that triggers a refresh block)
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oc-bg">
        <div className="flex w-48 flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // Show loading while waiting for refresh (only if token was missing/expired)
  if (!accessToken && !refreshFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oc-bg">
        <div className="flex w-48 flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (refreshFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oc-bg text-oc-muted text-sm">
        Session expired. Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
