"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshSessionApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    if (!hasHydrated || accessToken || refreshFailed) return;

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

  if (!hasHydrated || (!accessToken && !refreshFailed)) {
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

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oc-bg text-oc-muted text-sm">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
