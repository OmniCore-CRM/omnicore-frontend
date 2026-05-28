"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function HomePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (accessToken) router.replace("/inbox");
    else router.replace("/login");
  }, [accessToken, hasHydrated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-oc-bg text-sm text-oc-muted">
      Loading workspace…
    </div>
  );
}
