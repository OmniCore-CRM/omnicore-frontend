"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/api/notifications";
import { queryKeys } from "@/constants/query-keys";
import { SOCKET_EVENTS } from "@/constants/socket-events";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/api/errors";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { NotificationItem } from "@/types/models";
import { Bell, BellDot, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

type NotificationNewPayload = {
  notification: NotificationItem;
  unreadCount: number;
};

type NotificationUpdatedPayload = {
  notificationId: string;
  isRead: boolean;
  unreadCount: number;
};

type NotificationReadAllPayload = {
  unreadCount: number;
};

function normalizeRead(notification: NotificationItem) {
  const isRead = notification.isRead ?? notification.read;
  return {
    ...notification,
    isRead,
    read: isRead,
  };
}

function routeForNotification(notification: NotificationItem) {
  const metadata = notification.metadata as { route?: string } | undefined;
  if (metadata?.route) return metadata.route;

  if (notification.entityType === "TICKET") {
    return `/tickets?ticketId=${notification.entityId}`;
  }

  if (notification.entityType === "CONVERSATION") {
    return `/inbox?c=${notification.entityId}`;
  }

  if (notification.entityType === "TEAM") {
    return "/teams";
  }

  if (notification.entityType === "USER") {
    return "/settings";
  }

  return "/notifications";
}

function upsertInPaginatedCache(
  incoming: NotificationItem,
  old: Paginated<NotificationItem> | undefined,
) {
  const nextNotification = normalizeRead(incoming);
  const base = old ?? { items: [] as NotificationItem[] };
  const exists = base.items.some((item) => item.id === nextNotification.id);
  const items = exists
    ? base.items.map((item) =>
        item.id === nextNotification.id ? nextNotification : item,
      )
    : [nextNotification, ...base.items];

  return {
    ...base,
    items: items.slice(0, 100),
  };
}

export function NotificationCenter() {
  const token = useAuthStore((state) => state.accessToken);
  const socket = useSocket();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications({ scope: "header" }),
    queryFn: () => listNotifications(token!, { limit: 30 }),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!open) return;
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener("mousedown", onWindowClick);
    return () => window.removeEventListener("mousedown", onWindowClick);
  }, [open]);

  useEffect(() => {
    if (!socket) return;

    const upsertNotification = (incoming: NotificationItem) => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) =>
          upsertInPaginatedCache(incoming, old),
      );
    };

    const onNew = (payload: NotificationNewPayload) => {
      upsertNotification(payload.notification);
      queryClient.setQueryData(queryKeys.notificationUnreadCount, {
        unread: payload.unreadCount,
      });
    };

    const onUpdated = (payload: NotificationUpdatedPayload) => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === payload.notificationId
                ? {
                    ...item,
                    isRead: payload.isRead,
                    read: payload.isRead,
                  }
                : item,
            ),
          };
        },
      );

      queryClient.setQueryData(queryKeys.notificationUnreadCount, {
        unread: payload.unreadCount,
      });
    };

    const onReadAll = (payload: NotificationReadAllPayload) => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => ({
              ...item,
              isRead: true,
              read: true,
            })),
          };
        },
      );

      queryClient.setQueryData(queryKeys.notificationUnreadCount, {
        unread: payload.unreadCount,
      });
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, onNew);
    socket.on(SOCKET_EVENTS.NOTIFICATION_UPDATED, onUpdated);
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ_ALL, onReadAll);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, onNew);
      socket.off(SOCKET_EVENTS.NOTIFICATION_UPDATED, onUpdated);
      socket.off(SOCKET_EVENTS.NOTIFICATION_READ_ALL, onReadAll);
    };
  }, [queryClient, socket]);

  const markReadMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to mark notification as read."));
    },
    onSuccess: (notification) => {
      const normalized = normalizeRead(notification);
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === normalized.id ? normalized : item,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    },
  });

  const markUnreadMut = useMutation({
    mutationFn: (id: string) => markNotificationUnread(token!, id),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to mark notification as unread."));
    },
    onSuccess: (notification) => {
      const normalized = normalizeRead(notification);
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === normalized.id ? normalized : item,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to mark all notifications as read."));
    },
    onSuccess: () => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => ({
              ...item,
              isRead: true,
              read: true,
            })),
          };
        },
      );
      queryClient.setQueryData(queryKeys.notificationUnreadCount, { unread: 0 });
      toast.success("All notifications marked as read.");
    },
  });

  const notifications = useMemo(
    () => (notificationsQuery.data?.items ?? []).map(normalizeRead),
    [notificationsQuery.data?.items],
  );

  const unreadCount = unreadQuery.data?.unread ?? 0;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 shrink-0 px-0"
        onClick={() => setOpen((state) => !state)}
        aria-label="Open notifications"
      >
        {unreadCount > 0 ? (
          <BellDot className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-oc-accent px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+56px)] z-[120] mt-0 w-[calc(100vw-24px)] max-w-[380px] overflow-hidden rounded-xl border border-oc-border bg-oc-panel shadow-[0_24px_50px_rgba(0,0,0,0.55)] ring-1 ring-black/35 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(92vw,380px)]">
          <div className="flex items-center justify-between border-b border-oc-border px-3 py-2.5">
            <p className="text-sm font-semibold text-oc-text">Notifications</p>
            <div className="flex items-center gap-1.5">
              <Link href="/notifications" onClick={() => setOpen(false)}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                >
                  View all
                </Button>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => markAllReadMut.mutate()}
                disabled={markAllReadMut.isPending || unreadCount === 0}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                {markAllReadMut.isPending ? "Marking..." : "Mark all read"}
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto bg-oc-panel p-2">
            {notificationsQuery.isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg bg-oc-elevated" />
                ))}
              </div>
            )}

            {notificationsQuery.error && (
              <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-200">
                Failed to load notifications.
              </p>
            )}

            {!notificationsQuery.isLoading &&
              !notificationsQuery.error &&
              notifications.length === 0 && (
                <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg-mid p-4 text-sm text-oc-muted">
                  No notifications yet.
                </p>
              )}

            {notifications.map((notification) => {
              const route = routeForNotification(notification);
              const busy =
                markReadMut.isPending ||
                markUnreadMut.isPending ||
                markAllReadMut.isPending;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "mb-2 rounded-lg border p-3",
                    notification.isRead
                      ? "border-oc-border bg-oc-bg-mid"
                      : "border-oc-accent/35 bg-oc-elevated",
                  )}
                >
                  <Link
                    href={route}
                    onClick={() => setOpen(false)}
                    className="block cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-oc-text">
                          {notification.title}
                        </p>
                        <p className="mt-1 break-words text-sm text-oc-muted">
                          {notification.message || notification.body || ""}
                        </p>
                        <p className="mt-1 text-xs text-oc-faint">
                          {formatRelative(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-oc-accent" />
                      )}
                    </div>
                  </Link>

                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 cursor-pointer px-2.5 text-xs"
                      onClick={() => {
                        setOpen(false);
                        router.push(route);
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 cursor-pointer px-2 text-xs"
                      disabled={busy}
                      onClick={() => {
                        if (notification.isRead) {
                          markUnreadMut.mutate(notification.id);
                          return;
                        }
                        markReadMut.mutate(notification.id);
                      }}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      {busy
                        ? "Saving..."
                        : notification.isRead
                          ? "Mark unread"
                          : "Mark read"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
