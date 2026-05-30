"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTicketNote,
  createTicket,
  getTicket,
  listTicketActivity,
  listTicketNotes,
  listTickets,
  updateTicket,
} from "@/api/tickets";
import { listUsers } from "@/api/users";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/format-time";
import type {
  AuthUser,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/types/models";

const ticketStatuses: TicketStatus[] = [
  "OPEN",
  "PENDING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const ticketPriorities: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

function priorityTone(p: Ticket["priority"]) {
  if (p === "URGENT") return "danger" as const;
  if (p === "HIGH") return "warning" as const;
  if (p === "MEDIUM") return "accent" as const;
  return "neutral" as const;
}

function statusTone(s: Ticket["status"]) {
  if (s === "RESOLVED" || s === "CLOSED") return "success" as const;
  if (s === "ESCALATED") return "danger" as const;
  if (s === "PENDING") return "warning" as const;
  return "neutral" as const;
}

const displayUser = (user?: AuthUser | null) =>
  user?.displayName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "—";

export default function TicketsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const socket = useSocket();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [createPriority, setCreatePriority] =
    useState<TicketPriority>("MEDIUM");
  const [customerId, setCustomerId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const canMutate = user?.role !== "VIEWER";

  const params = useMemo(
    () => ({
      search: q || undefined,
      status: status || undefined,
      priority: priority || undefined,
      limit: 50,
    }),
    [priority, q, status],
  );

  const ticketListKey = queryKeys.tickets(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v ?? "")])),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ticketListKey,
    queryFn: () => listTickets(token!, params),
    enabled: !!token,
  });

  const { data: ticket, isLoading: tLoading } = useQuery({
    queryKey: queryKeys.ticket(selectedId ?? "_"),
    queryFn: () => getTicket(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  useEffect(() => {
    if (!socket) return;

    const refreshTickets = () => {
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      if (selectedId) {
        void qc.invalidateQueries({ queryKey: queryKeys.ticket(selectedId) });
        void qc.invalidateQueries({
          queryKey: ["ticket-activity", selectedId],
        });
        void qc.invalidateQueries({
          queryKey: ["ticket-notes", selectedId],
        });
      }
    };

    socket.on("ticket_created", refreshTickets);
    socket.on("ticket_updated", refreshTickets);
    socket.on("ticket_note_added", refreshTickets);

    return () => {
      socket.off("ticket_created", refreshTickets);
      socket.off("ticket_updated", refreshTickets);
      socket.off("ticket_note_added", refreshTickets);
    };
  }, [qc, selectedId, socket]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(token!),
    enabled: !!token,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["ticket-notes", selectedId ?? "_"],
    queryFn: () => listTicketNotes(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["ticket-activity", selectedId ?? "_"],
    queryFn: () => listTicketActivity(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createTicket(token!, {
        subject,
        description: description || undefined,
        priority: createPriority,
        customerId: customerId || undefined,
        conversationId: conversationId || undefined,
        assigneeId: assigneeId || undefined,
      }),
    onSuccess: async (created) => {
      toast.success("Ticket created");
      setSelectedId(created.id);
      setCreating(false);
      setSubject("");
      setDescription("");
      setCustomerId("");
      setConversationId("");
      setAssigneeId("");
      setCreatePriority("MEDIUM");
      await qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create ticket"));
    },
  });

  const updateMut = useMutation({
    mutationFn: (body: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assigneeId?: string | null;
    }) => updateTicket(token!, selectedId!, body),
    onSuccess: async (updated) => {
      toast.success("Ticket updated");
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      await qc.invalidateQueries({ queryKey: ["ticket-activity", updated.id] });
      qc.setQueryData(queryKeys.ticket(updated.id), updated);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not update ticket"));
    },
  });

  const noteMut = useMutation({
    mutationFn: () =>
      createTicketNote(token!, selectedId!, {
        content: noteDraft,
      }),
    onSuccess: async () => {
      toast.success("Internal note added");
      setNoteDraft("");
      await qc.invalidateQueries({ queryKey: ["ticket-notes", selectedId] });
      await qc.invalidateQueries({ queryKey: ["ticket-activity", selectedId] });
      if (selectedId) {
        await qc.invalidateQueries({ queryKey: queryKeys.ticket(selectedId) });
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not add note"));
    },
  });

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || createMut.isPending) return;
    createMut.mutate();
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <header className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-oc-text">Tickets</h1>
            <p className="text-sm text-oc-muted">
              Track customer issues with priority, ownership, and lifecycle state.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tickets..."
              className="h-9 sm:w-56"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus | "")}
              className="h-9 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
            >
              <option value="">All statuses</option>
              {ticketStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TicketPriority | "")
              }
              className="h-9 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
            >
              <option value="">All priorities</option>
              {ticketPriorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={!canMutate}
              onClick={() => setCreating((current) => !current)}
            >
              New ticket
            </Button>
          </div>
        </header>

        {creating && (
          <Card className="mb-4 p-4">
            <form onSubmit={submitCreate} className="grid gap-3 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="text-xs text-oc-faint">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs text-oc-faint">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-oc-faint">Priority</label>
                <select
                  value={createPriority}
                  onChange={(e) =>
                    setCreatePriority(e.target.value as TicketPriority)
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                >
                  {ticketPriorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-oc-faint">
                  Conversation ID
                </label>
                <Input
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="mt-1"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs text-oc-faint">Customer ID</label>
                <Input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs text-oc-faint">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                        u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  disabled={createMut.isPending || !subject.trim()}
                >
                  {createMut.isPending ? "Creating..." : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/60 text-[11px] uppercase tracking-wide text-oc-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-oc-border/60">
                      <td className="px-4 py-3" colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {error && (
                  <tr>
                    <td className="px-4 py-6 text-oc-danger" colSpan={6}>
                      {getErrorMessage(error, "Failed to load tickets.")}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && data?.items.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-oc-muted" colSpan={6}>
                      No tickets found.
                    </td>
                  </tr>
                )}
                {data?.items.map((t: Ticket) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(t.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer border-b border-oc-border/40 hover:bg-oc-panel/40 ${
                      selectedId === t.id ? "bg-oc-panel/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-oc-text">
                      {t.subject}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(t.status)} className="normal-case">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={priorityTone(t.priority)}
                        className="normal-case"
                      >
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-oc-muted">
                      {t.customer
                        ? [t.customer.firstName, t.customer.lastName]
                            .filter(Boolean)
                            .join(" ") ||
                          t.customer.email ||
                          "Customer"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-oc-muted">
                      {displayUser(t.assignee)}
                    </td>
                    <td className="px-4 py-3 text-xs text-oc-faint">
                      {t.updatedAt ? formatRelative(t.updatedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="w-full shrink-0 border-t border-oc-border bg-oc-bg-mid/50 p-4 lg:w-[360px] lg:border-l lg:border-t-0">
        {!selectedId && (
          <p className="text-sm text-oc-muted">Select a ticket for details.</p>
        )}
        {tLoading && <Skeleton className="h-40 w-full rounded-xl" />}
        {ticket && (
          <Card className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold text-oc-text">
                {ticket.subject}
              </h2>
              {ticket.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-oc-muted">
                  {ticket.description}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <label className="text-xs text-oc-faint">
                Status
                <select
                  value={ticket.status}
                  disabled={!canMutate || updateMut.isPending}
                  onChange={(e) =>
                    updateMut.mutate({
                      status: e.target.value as TicketStatus,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                >
                  {ticketStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-oc-faint">
                Priority
                <select
                  value={ticket.priority}
                  disabled={!canMutate || updateMut.isPending}
                  onChange={(e) =>
                    updateMut.mutate({
                      priority: e.target.value as TicketPriority,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                >
                  {ticketPriorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-oc-faint">
                Assignee
                <select
                  value={ticket.assigneeId ?? ""}
                  disabled={!canMutate || updateMut.isPending}
                  onChange={(e) =>
                    updateMut.mutate({
                      assigneeId: e.target.value || null,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                        u.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2 text-xs text-oc-muted">
              <p>Assignee: {displayUser(ticket.assignee)}</p>
              <p>Created by: {displayUser(ticket.createdBy)}</p>
              <p>
                Customer:{" "}
                {ticket.customer
                  ? [ticket.customer.firstName, ticket.customer.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    ticket.customer.email ||
                    ticket.customer.id
                  : "—"}
              </p>
              <p>
                Conversation:{" "}
                {ticket.conversation ? (
                  <span className="font-mono text-oc-text">
                    {ticket.conversation.id}
                  </span>
                ) : (
                  "—"
                )}
              </p>
              <p>
                Updated:{" "}
                {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
              </p>
            </div>

            <div className="space-y-3 border-t border-oc-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                Internal notes
              </h3>
              {canMutate && (
                <div className="space-y-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add an internal note..."
                    className="min-h-20"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={noteMut.isPending || !noteDraft.trim()}
                    onClick={() => noteMut.mutate()}
                  >
                    {noteMut.isPending ? "Adding..." : "Add note"}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-oc-muted">No internal notes.</p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-oc-border bg-oc-panel/60 p-3"
                    >
                      <p className="whitespace-pre-wrap text-sm text-oc-text">
                        {note.content}
                      </p>
                      <p className="mt-2 text-[11px] text-oc-faint">
                        {displayUser(note.author)} ·{" "}
                        {formatRelative(note.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-oc-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                Activity
              </h3>
              {activity.length === 0 ? (
                <p className="text-xs text-oc-muted">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-oc-bg/70 px-3 py-2 text-xs text-oc-muted"
                    >
                      <p className="font-medium text-oc-text">
                        {item.action.replaceAll("_", " ").toLowerCase()}
                      </p>
                      <p className="mt-1 text-oc-faint">
                        {displayUser(item.actor)} ·{" "}
                        {formatRelative(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
