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
import { cn } from "@/lib/utils";
import type {
  AuthUser,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/types/models";
import { ArrowLeft, MessageSquare, UserRound } from "lucide-react";

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

const displayCustomer = (ticket?: Ticket | null) =>
  ticket?.customer
    ? [ticket.customer.firstName, ticket.customer.lastName]
        .filter(Boolean)
        .join(" ") ||
      ticket.customer.email ||
      "Customer"
    : "—";

const formatActivityAction = (action: string) =>
  action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());

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

  const tickets = data?.items ?? [];

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <section
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-4 md:p-5 xl:p-6",
          selectedId && "hidden lg:block",
        )}
      >
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-oc-faint">
              Support operations
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-oc-text">
              Tickets
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-oc-muted">
              Track customer issues with priority, ownership, notes, and
              lifecycle state.
            </p>
          </div>
          <Button
            type="button"
            disabled={!canMutate}
            onClick={() => setCreating((current) => !current)}
            className="w-full sm:w-auto"
          >
            {creating ? "Close form" : "New ticket"}
          </Button>
        </header>

        <Card className="mb-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px] xl:grid-cols-[minmax(260px,1fr)_190px_190px]">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tickets..."
              className="h-10"
              aria-label="Search tickets"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus | "")}
              className="h-10 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
              aria-label="Filter by status"
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
              className="h-10 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
              aria-label="Filter by priority"
            >
              <option value="">All priorities</option>
              {ticketPriorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {creating && (
          <Card className="mb-4 p-4 md:p-5">
            <form onSubmit={submitCreate} className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-oc-text">
                  Subject
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-2"
                    placeholder="Short issue summary"
                    required
                  />
                </label>
              </div>
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-oc-text">
                  Description
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-2 min-h-28"
                    placeholder="Optional context for the support team"
                  />
                </label>
              </div>
              <label className="text-sm font-medium text-oc-text">
                Priority
                <select
                  value={createPriority}
                  onChange={(e) =>
                    setCreatePriority(e.target.value as TicketPriority)
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                >
                  {ticketPriorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-oc-text">
                Assignee
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
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
              <label className="text-sm font-medium text-oc-text">
                Conversation ID
                <Input
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="mt-2"
                  placeholder="Optional"
                />
              </label>
              <label className="text-sm font-medium text-oc-text">
                Customer ID
                <Input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-2"
                  placeholder="Optional"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:col-span-2">
                <Button
                  type="submit"
                  disabled={createMut.isPending || !subject.trim()}
                >
                  {createMut.isPending ? "Creating..." : "Create ticket"}
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
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/60 text-xs uppercase tracking-wide text-oc-faint">
                <tr>
                  <th className="w-[34%] px-4 py-3 font-medium">Subject</th>
                  <th className="w-[13%] px-4 py-3 font-medium">Status</th>
                  <th className="w-[13%] px-4 py-3 font-medium">Priority</th>
                  <th className="w-[16%] px-4 py-3 font-medium">Customer</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Assignee</th>
                  <th className="w-[10%] px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-oc-border/60">
                      <td className="px-4 py-4" colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))}
                {error && (
                  <tr>
                    <td className="px-4 py-8" colSpan={6}>
                      <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                        {getErrorMessage(error, "Failed to load tickets.")}
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && !error && tickets.length === 0 && (
                  <tr>
                    <td className="px-4 py-10" colSpan={6}>
                      <EmptyTicketsState filtered={Boolean(q || status || priority)} />
                    </td>
                  </tr>
                )}
                {tickets.map((t: Ticket) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    active={selectedId === t.id}
                    onSelect={() => setSelectedId(t.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            {error && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                {getErrorMessage(error, "Failed to load tickets.")}
              </div>
            )}
            {!isLoading && !error && tickets.length === 0 && (
              <EmptyTicketsState filtered={Boolean(q || status || priority)} />
            )}
            {tickets.map((t: Ticket) => (
              <TicketCard
                key={t.id}
                ticket={t}
                active={selectedId === t.id}
                onSelect={() => setSelectedId(t.id)}
              />
            ))}
          </div>
        </Card>
      </section>

      <TicketDetailPanel
        ticket={ticket}
        selectedId={selectedId}
        loading={tLoading}
        canMutate={canMutate}
        users={users}
        notes={notes}
        activity={activity}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        onBack={() => setSelectedId(null)}
        updateMutate={(body) => updateMut.mutate(body)}
        updating={updateMut.isPending}
        noteMutate={() => noteMut.mutate()}
        addingNote={noteMut.isPending}
      />
    </div>
  );
}

function TicketRow({
  ticket,
  active,
  onSelect,
}: {
  ticket: Ticket;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer border-b border-oc-border/40 transition-colors hover:bg-oc-panel/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-oc-accent",
        active && "bg-oc-panel/70",
      )}
    >
      <td className="px-4 py-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-oc-text">
            {ticket.subject}
          </p>
          <p className="mt-1 truncate text-xs text-oc-faint">
            {ticket.conversation?.channel
              ? `${ticket.conversation.channel} conversation`
              : "Manual ticket"}
          </p>
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge tone={statusTone(ticket.status)} className="normal-case">
          {ticket.status}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <Badge tone={priorityTone(ticket.priority)} className="normal-case">
          {ticket.priority}
        </Badge>
      </td>
      <td className="truncate px-4 py-4 text-oc-muted">
        {displayCustomer(ticket)}
      </td>
      <td className="truncate px-4 py-4 text-oc-muted">
        {displayUser(ticket.assignee)}
      </td>
      <td className="px-4 py-4 text-xs text-oc-faint">
        {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
      </td>
    </tr>
  );
}

function TicketCard({
  ticket,
  active,
  onSelect,
}: {
  ticket: Ticket;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border border-oc-border bg-oc-bg-mid/80 p-4 text-left transition-colors hover:bg-oc-panel/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
        active && "bg-oc-panel ring-1 ring-violet-500/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-oc-text">
            {ticket.subject}
          </p>
          <p className="mt-1 text-xs text-oc-faint">
            Updated {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
          </p>
        </div>
        <Badge tone={priorityTone(ticket.priority)} className="normal-case">
          {ticket.priority}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={statusTone(ticket.status)} className="normal-case">
          {ticket.status}
        </Badge>
        {ticket.conversation?.channel && (
          <Badge tone="neutral" className="normal-case">
            {ticket.conversation.channel}
          </Badge>
        )}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-oc-muted">
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-oc-faint" />
          <span className="truncate">{displayCustomer(ticket)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-oc-faint" />
          <span className="truncate">Assignee: {displayUser(ticket.assignee)}</span>
        </span>
      </div>
    </button>
  );
}

function EmptyTicketsState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-oc-border bg-oc-panel/30 p-8 text-center">
      <p className="text-sm font-semibold text-oc-text">
        {filtered ? "No matching tickets" : "No tickets yet"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-oc-muted">
        {filtered
          ? "Try adjusting the search, status, or priority filters."
          : "Tickets created manually or from customer conversations will appear here."}
      </p>
    </div>
  );
}

function TicketDetailPanel({
  ticket,
  selectedId,
  loading,
  canMutate,
  users,
  notes,
  activity,
  noteDraft,
  setNoteDraft,
  onBack,
  updateMutate,
  updating,
  noteMutate,
  addingNote,
}: {
  ticket?: Ticket;
  selectedId: string | null;
  loading: boolean;
  canMutate: boolean;
  users: AuthUser[];
  notes: Ticket["notes"];
  activity: Ticket["activities"];
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  onBack: () => void;
  updateMutate: (body: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
  }) => void;
  updating: boolean;
  noteMutate: () => void;
  addingNote: boolean;
}) {
  return (
    <aside
      className={cn(
        "min-h-0 w-full shrink-0 border-l border-oc-border bg-oc-bg-mid/60 lg:w-[390px] xl:w-[430px]",
        !selectedId && "hidden lg:block",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-14 items-center gap-3 border-b border-oc-border px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0 lg:hidden"
            onClick={onBack}
            aria-label="Back to tickets"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-oc-text">
              Ticket detail
            </p>
            <p className="text-xs text-oc-faint">
              Status, ownership, notes, and activity
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!selectedId && (
            <div className="rounded-lg border border-dashed border-oc-border bg-oc-panel/30 p-6 text-center">
              <p className="text-sm font-semibold text-oc-text">
                Select a ticket
              </p>
              <p className="mt-2 text-sm leading-6 text-oc-muted">
                Open a ticket to update status, priority, assignee, notes, and
                activity.
              </p>
            </div>
          )}

          {selectedId && loading && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          )}

          {ticket && (
            <div className="space-y-4">
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(ticket.status)} className="normal-case">
                    {ticket.status}
                  </Badge>
                  <Badge
                    tone={priorityTone(ticket.priority)}
                    className="normal-case"
                  >
                    {ticket.priority}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-6 text-oc-text">
                    {ticket.subject}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-oc-muted">
                    {ticket.description || "No description provided."}
                  </p>
                </div>
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                  Controls
                </h3>
                <label className="block text-sm font-medium text-oc-text">
                  Status
                  <select
                    value={ticket.status}
                    disabled={!canMutate || updating}
                    onChange={(event) =>
                      updateMutate({
                        status: event.target.value as TicketStatus,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                  >
                    {ticketStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-oc-text">
                  Priority
                  <select
                    value={ticket.priority}
                    disabled={!canMutate || updating}
                    onChange={(event) =>
                      updateMutate({
                        priority: event.target.value as TicketPriority,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                  >
                    {ticketPriorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-oc-text">
                  Assignee
                  <select
                    value={ticket.assigneeId ?? ""}
                    disabled={!canMutate || updating}
                    onChange={(event) =>
                      updateMutate({
                        assigneeId: event.target.value || null,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
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
              </Card>

              <Card className="space-y-3 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                  Context
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-oc-muted">Customer</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayCustomer(ticket)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-oc-muted">Assignee</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayUser(ticket.assignee)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-oc-muted">Created by</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayUser(ticket.createdBy)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-oc-muted">Conversation</dt>
                    <dd className="flex min-w-0 items-center gap-1 truncate text-oc-text">
                      {ticket.conversation ? (
                        <>
                          <MessageSquare className="h-4 w-4 shrink-0 text-oc-faint" />
                          <span className="truncate">
                            {ticket.conversation.channel} ·{" "}
                            {ticket.conversation.id}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-oc-muted">Updated</dt>
                    <dd className="text-oc-text">
                      {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                    Internal notes
                  </h3>
                  <p className="mt-1 text-sm text-oc-muted">
                    Private notes for the support team.
                  </p>
                </div>
                {canMutate && (
                  <div className="space-y-2">
                    <Textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Add an internal note..."
                      className="min-h-24 resize-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={addingNote || !noteDraft.trim()}
                      onClick={noteMutate}
                    >
                      {addingNote ? "Adding..." : "Add note"}
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  {!notes?.length ? (
                    <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                      No internal notes yet.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-oc-border bg-oc-panel/60 p-3"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6 text-oc-text">
                          {note.content}
                        </p>
                        <p className="mt-2 text-xs text-oc-faint">
                          {displayUser(note.author)} ·{" "}
                          {formatRelative(note.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="space-y-4 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-oc-faint">
                  Activity history
                </h3>
                {!activity?.length ? (
                  <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                    No activity yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg bg-oc-bg/70 px-3 py-3 text-sm text-oc-muted"
                      >
                        <p className="font-medium text-oc-text">
                          {formatActivityAction(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-oc-faint">
                          {displayUser(item.actor)} ·{" "}
                          {formatRelative(item.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
