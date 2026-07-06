"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/api/notifications";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { NotificationItem } from "@/types/models";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

function typeLabel(type: NotificationItem["type"]) {
  return type
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function entityLabel(entityType: string) {
  return entityType[0] + entityType.slice(1).toLowerCase();
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

export default function NotificationsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications({ scope: "page" }),
    queryFn: () => listNotifications(token!, { limit: 100 }),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: () => getUnreadNotificationCount(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onMutate: (id) => setActiveItemId(id),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to mark notification as read."));
    },
    onSuccess: (notification) => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) =>
          upsertInPaginatedCache(notification, old),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    },
    onSettled: () => setActiveItemId(null),
  });

  const markUnreadMut = useMutation({
    mutationFn: (id: string) => markNotificationUnread(token!, id),
    onMutate: (id) => setActiveItemId(id),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to mark notification as unread."));
    },
    onSuccess: (notification) => {
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Paginated<NotificationItem> | undefined) =>
          upsertInPaginatedCache(notification, old),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    },
    onSettled: () => setActiveItemId(null),
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
    <section className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-5 lg:p-6">
        <Card className="border-oc-border bg-oc-bg-mid/95 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-oc-text sm:text-xl">
                Notifications
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-oc-muted">
                Quick actions stay in the bell dropdown. This page is the full workspace for
                reviewing long notification messages and managing read state.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={unreadCount > 0 ? "accent" : "neutral"}>
                Unread: {unreadCount}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => markAllReadMut.mutate()}
                disabled={markAllReadMut.isPending || unreadCount === 0}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {markAllReadMut.isPending ? "Marking..." : "Mark all read"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-4 rounded-xl border border-oc-border bg-oc-panel p-3 sm:p-4">
          {notificationsQuery.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-lg bg-oc-elevated" />
              ))}
            </div>
          )}

          {notificationsQuery.error && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
              <p>Failed to load notifications.</p>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    void notificationsQuery.refetch();
                    void unreadQuery.refetch();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!notificationsQuery.isLoading &&
            !notificationsQuery.error &&
            notifications.length === 0 && (
              <div className="rounded-lg border border-dashed border-oc-border bg-oc-bg-mid p-6 text-center">
                <Bell className="mx-auto h-8 w-8 text-oc-faint" />
                <p className="mt-3 text-sm text-oc-muted">No notifications yet.</p>
              </div>
            )}

          {!notificationsQuery.isLoading &&
            !notificationsQuery.error &&
            notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const route = routeForNotification(notification);
                  const isBusy =
                    markAllReadMut.isPending ||
                    activeItemId === notification.id ||
                    markReadMut.isPending ||
                    markUnreadMut.isPending;

                  return (
                    <article
                      key={notification.id}
                      className={cn(
                        "rounded-lg border p-4",
                        notification.isRead
                          ? "border-oc-border bg-oc-bg-mid"
                          : "border-oc-accent/35 bg-oc-elevated",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-oc-text sm:text-base">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-oc-accent" />
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-oc-border bg-oc-panel px-2 py-0.5 text-oc-muted">
                              {typeLabel(notification.type)}
                            </span>
                            <span className="rounded-full border border-oc-border bg-oc-panel px-2 py-0.5 text-oc-muted">
                              {entityLabel(notification.entityType)}
                            </span>
                            <span className="rounded-full border border-oc-border bg-oc-panel px-2 py-0.5 text-oc-faint">
                              {formatRelative(notification.createdAt)}
                            </span>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-oc-muted sm:text-[15px]">
                            {notification.message || notification.body || ""}
                          </p>
                        </div>

                        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
                          <Link href={route} className="min-w-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="cursor-pointer"
                            >
                              Open
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer"
                            disabled={isBusy}
                            onClick={() => {
                              if (notification.isRead) {
                                markUnreadMut.mutate(notification.id);
                                return;
                              }
                              markReadMut.mutate(notification.id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {isBusy
                              ? "Saving..."
                              : notification.isRead
                                ? "Mark unread"
                                : "Mark read"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
