"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  Inbox,
  Library,
  MessageSquare,
  Settings,
  Ticket,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { Permissions, hasPermission } from "@/lib/permissions";

const links = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/my-work", label: "My Work", icon: Briefcase },
  { href: "/assignment-center", label: "Assignment Center", icon: ActivitySquare },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/knowledge-base", label: "Knowledge Base", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const compact = collapsed && !mobile;
  const visibleLinks = links.filter((link) =>
    link.href === "/knowledge-base"
      ? hasPermission(role, Permissions.manageKnowledgeBase)
      : true,
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-oc-border bg-oc-bg-mid/95 shadow-2xl shadow-black/20 backdrop-blur transition-[width] duration-200",
        compact ? "w-[68px]" : "w-[220px]",
        mobile && "relative z-10 w-[min(82vw,300px)]",
      )}
    >
      <div className="flex min-h-14 items-center justify-between border-b border-oc-border px-3">
        {!compact && (
          <Link
            href="/inbox"
            prefetch={false}
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-oc-panel ring-1 ring-oc-border">
              <span className="h-2.5 w-2.5 rounded-full bg-oc-accent shadow-[0_0_16px_rgba(124,58,237,0.8)]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-oc-text">
                OmniCore
              </span>
              <span className="block truncate text-xs text-oc-muted">
                CRM workspace
              </span>
            </span>
          </Link>
        )}
        {compact && (
          <Link
            href="/inbox"
            prefetch={false}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-oc-panel ring-1 ring-oc-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent"
            aria-label="OmniCore home"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-oc-accent" />
          </Link>
        )}
        {mobile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            onClick={onNavigate}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {!mobile && (
        <div
          className={cn(
            "flex border-b border-oc-border px-2 py-1.5",
            compact ? "justify-center" : "justify-end",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 justify-center px-0"
            onClick={toggleSidebar}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/inbox" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              title={compact ? label : undefined}
              onClick={onNavigate}
              className={cn(
                "group flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
                active
                  ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/35 shadow-[inset_3px_0_0_rgba(124,58,237,0.9)]"
                  : "text-oc-muted hover:bg-oc-panel/80 hover:text-oc-text",
                compact && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90 transition-opacity group-hover:opacity-100" />
              {!compact && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
