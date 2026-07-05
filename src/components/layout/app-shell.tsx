"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-oc-bg text-oc-text">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <AppSidebar
            mobile
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-oc-bg via-oc-bg to-oc-bg-mid p-2.5 sm:p-3 lg:p-4">
          <div className="h-full min-h-0 overflow-hidden rounded-lg border border-oc-border/70 bg-oc-bg-mid/60 shadow-oc-card">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
