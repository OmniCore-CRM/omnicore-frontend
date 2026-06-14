"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { markConversationRead } from "@/api/conversations";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";
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

  // Initialize company-scoped realtime inbox events.
  useInboxRealtime(company?.id ?? null);

  useEffect(() => {
    const c = searchParams.get("c");
    if (c) setSelectedId(c);
  }, [searchParams, setSelectedId]);

  useEffect(() => {
    if (!token || !selectedId) return;
    
    // Mark active conversation as read when opened.
    // Backend route is optional during MVP stage.
    void markConversationRead(token, selectedId).catch(() => {
      /* optional route — ignore if backend does not implement */
    });
  }, [token, selectedId]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <ConversationListPanel selected={Boolean(selectedId)} />
      <MessageThreadPanel
        onBack={() => setSelectedId(null)}
        onOpenCustomer={() => setCustomerPanelOpen(true)}
        customerPanelCollapsed={customerPanelCollapsed}
        onToggleCustomerPanel={() =>
          setCustomerPanelCollapsed((collapsed) => !collapsed)
        }
      />
      <CustomerInspectorPanel
        desktopCollapsed={customerPanelCollapsed}
        mobileOpen={customerPanelOpen}
        onCloseMobile={() => setCustomerPanelOpen(false)}
      />
    </div>
  );
}
