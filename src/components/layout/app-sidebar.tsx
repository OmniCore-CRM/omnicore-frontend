"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquare,
  Settings,
  Ticket,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-oc-border bg-oc-bg-mid transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-oc-border px-3">
        {!collapsed && (
          <Link href="/inbox" className="flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-oc-accent shadow-[0_0_12px_rgba(124,58,237,0.8)]" />
            <span className="text-sm font-semibold tracking-tight text-oc-text">
              OmniCore
            </span>
          </Link>
        )}
        {collapsed && (
          <Link
            href="/inbox"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-oc-panel ring-1 ring-oc-border"
            aria-label="OmniCore home"
          >
            <span className="h-2 w-2 rounded-full bg-oc-accent" />
          </Link>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/inbox" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/30"
                  : "text-oc-muted hover:bg-oc-panel hover:text-oc-text",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-oc-border p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
