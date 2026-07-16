"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { markConversationRead } from "@/api/conversations";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";
import { usePerformanceMetrics } from "@/hooks/use-performance-metrics";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { ConversationListPanel } from "@/features/inbox/conversation-list-panel";
import { CustomerInspectorPanel } from "@/features/inbox/customer-inspector-panel";
import { MessageThreadPanel } from "@/features/inbox/message-thread-panel";

export function InboxView() {
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);
  const company = useAuthStore((s) => s.company);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const setSelectedId = useInboxStore((s) => s.setSelectedConversationId);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  const [customerPanelCollapsed, setCustomerPanelCollapsed] = useState(false);

  // Capture performance metrics for the inbox route (Priority 6)
  usePerformanceMetrics({
    route: "/inbox",
    shellSelector: "header, banner, [role='banner']",
    contentSelector: "section",
    enableLogging: true,
  });

  // Initialize company-scoped realtime inbox events.
  useInboxRealtime(company?.id ?? null);

  useEffect(() => {
    const c = searchParams.get("c");
    if (c) setSelectedId(c);
  }, [searchParams, setSelectedId]);

  useEffect(() => {
    if (!token || !selectedId) return;

    // Defer non-critical read acknowledgment to keep conversation opening responsive.
    const timeoutId = setTimeout(() => {
      void markConversationRead(token, selectedId).catch(() => {
        /* optional route — ignore if backend does not implement */
      });
    }, 1200);

    // Mark active conversation as read when opened.
    // Backend route is optional during MVP stage.
    return () => clearTimeout(timeoutId);
  }, [token, selectedId]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <ConversationListPanel selected={Boolean(selectedId)} />
      <MessageThreadPanel
        onBack={() => setSelectedId(null)}
        onOpenCustomer={() => setCustomerPanelOpen(true)}
      />
      <CustomerInspectorPanel
        desktopCollapsed={customerPanelCollapsed}
        onToggleDesktop={() =>
          setCustomerPanelCollapsed((collapsed) => !collapsed)
        }
        mobileOpen={customerPanelOpen}
        onCloseMobile={() => setCustomerPanelOpen(false)}
      />
    </div>
  );
}
