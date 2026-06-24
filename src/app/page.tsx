"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshSessionApi } from "@/api/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function HomePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hasHydrated || checked) return;
    if (accessToken) {
      router.replace("/inbox");
      return;
    }

    let cancelled = false;
    refreshSessionApi()
      .then((session) => {
        if (cancelled) return;
        setSession(session);
        router.replace("/inbox");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, checked, hasHydrated, router, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-oc-bg text-sm text-oc-muted">
      Loading workspace…
    </div>
  );
}
