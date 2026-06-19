"use client";

import {
  FormEvent,
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
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
import { assignTicketTeam, listTeams } from "@/api/teams";
import { listTags } from "@/api/tags";
import { downloadAttachment, uploadTicketAttachment } from "@/api/attachments";
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
import { TagEditor, TagPills } from "@/features/tags/tag-editor";
import { AttachmentList } from "@/features/attachments/attachment-list";
import { formatRelative } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  AuthUser,
  Attachment,
  Message,
  SlaStatus,
  Ticket,
  TicketActivity,
  TicketPriority,
  TicketStatus,
  Team,
} from "@/types/models";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Eye,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Paperclip,
  Reply,
  Search,
  Timer,
  TicketIcon,
  UserRound,
} from "lucide-react";

const ticketStatuses: TicketStatus[] = [
  "OPEN",
  "PENDING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const allowedStatusTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["PENDING", "ESCALATED"],
  PENDING: ["OPEN", "RESOLVED"],
  ESCALATED: ["PENDING", "RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const ticketPriorities: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];
const slaStatuses: SlaStatus[] = ["ON_TRACK", "AT_RISK", "BREACHED", "PAUSED"];

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

function slaTone(status: SlaStatus) {
  if (status === "BREACHED") return "danger" as const;
  if (status === "AT_RISK") return "warning" as const;
  if (status === "PAUSED") return "accent" as const;
  return "success" as const;
}

const displayUser = (user?: AuthUser | null) =>
  user?.displayName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "—";

const displayAssignee = (user?: AuthUser | null) =>
  user ? displayUser(user) : "Unassigned";

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

const formatMetadataValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const formatActivityTitle = (item: TicketActivity) => {
  const from = formatMetadataValue(item.metadata?.from);
  const to = formatMetadataValue(item.metadata?.to);

  if (item.action === "STATUS_CHANGED" && from && to) {
    return `Status changed from ${from} to ${to}`;
  }

  if (item.action === "PRIORITY_CHANGED" && from && to) {
    return `Priority changed from ${from} to ${to}`;
  }

  if (item.action === "ASSIGNED") {
    return from && to ? "Ticket reassigned" : "Ticket assigned";
  }

  if (item.action === "UNASSIGNED") return "Ticket unassigned";
  if (item.action === "NOTE_ADDED") return "Internal note added";
  if (item.action === "TICKET_CREATED_FROM_WIDGET") {
    return "Ticket created from widget";
  }
  if (item.action === "MESSAGE_RECEIVED_ON_WIDGET") {
    return "Widget message received";
  }
  if (item.action === "SLA_BREACHED") return "SLA breached";
  if (item.action === "SLA_UPDATED") return "SLA timing updated";
  if (item.action === "AUTO_TEAM_ASSIGNED") {
    return "Automatically routed to team";
  }

  return formatActivityAction(item.action);
};

const getStatusOptions = (status: TicketStatus) =>
  Array.from(new Set([status, ...allowedStatusTransitions[status]]));

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatDuration = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "Less than 1m";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
};

type TimelineItem = {
  id: string;
  createdAt: string;
  title: string;
  actor: string;
  content?: string;
  kind: "activity" | "customer_message" | "agent_reply";
};

const messageTimelineTitle = (message: Message) => {
  if (message.sender === "AGENT") return "Agent reply sent";
  if (message.sender === "CUSTOMER") return "Customer message received";
  return "System message recorded";
};

const buildTimelineItems = (
  activity: Ticket["activities"],
  messages: Message[] = [],
) =>
  [
    ...(activity ?? []).map<TimelineItem>((item) => ({
      id: `activity-${item.id}`,
      createdAt: item.createdAt,
      title: formatActivityTitle(item),
      actor: displayUser(item.actor),
      kind: "activity",
    })),
    ...messages.map<TimelineItem>((message) => ({
      id: `message-${message.id}`,
      createdAt: message.createdAt,
      title: messageTimelineTitle(message),
      actor:
        message.sender === "AGENT"
          ? "Support team"
          : message.sender === "CUSTOMER"
            ? "Customer"
            : "System",
      content: message.content,
      kind:
        message.sender === "AGENT"
          ? "agent_reply"
          : message.sender === "CUSTOMER"
            ? "customer_message"
            : "activity",
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OC";

const fieldControlClass =
  "mt-2 h-11 w-full min-w-0 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent";

const buildTicketSummary = (tickets: Ticket[], total?: number) => ({
  total: total ?? tickets.length,
  openPending: tickets.filter(
    (ticket) => ticket.status === "OPEN" || ticket.status === "PENDING",
  ).length,
  escalated: tickets.filter((ticket) => ticket.status === "ESCALATED").length,
  resolvedClosed: tickets.filter(
    (ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED",
  ).length,
});

function activityIconClass(action: string) {
  const key = action.toUpperCase();
  if (key.includes("NOTE")) return "bg-violet-500/20 text-violet-200";
  if (key.includes("ASSIGN")) return "bg-sky-500/20 text-sky-200";
  if (key.includes("STATUS") || key.includes("RESOLVED")) {
    return "bg-emerald-500/20 text-emerald-200";
  }
  return "bg-oc-panel text-oc-muted";
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6 text-sm text-oc-muted">
          Loading tickets…
        </div>
      }
    >
      <TicketsWorkspace />
    </Suspense>
  );
}

function TicketsWorkspace() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get("ticketId");
  const [q, setQ] = useState("");
  const debouncedSearch = useDebouncedValue(q);
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [filterAssigneeId, setFilterAssigneeId] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [slaStatus, setSlaStatus] = useState<SlaStatus | "">("");
  const [teamId, setTeamId] = useState("");
  const [tagId, setTagId] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTicketId,
  );
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [createPriority, setCreatePriority] =
    useState<TicketPriority>("MEDIUM");
  const [customerId, setCustomerId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const canMutate = user?.role !== "VIEWER";

  const resetPagination = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      assigneeId: filterAssigneeId || undefined,
      createdDate: createdDate || undefined,
      updatedDate: updatedDate || undefined,
      slaStatus: slaStatus || undefined,
      teamId: teamId || undefined,
      tagId: tagId || undefined,
      cursor,
      limit: 30,
    }),
    [
      cursor,
      createdDate,
      debouncedSearch,
      filterAssigneeId,
      priority,
      slaStatus,
      status,
      tagId,
      teamId,
      updatedDate,
    ],
  );

  const ticketListKey = queryKeys.tickets(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v ?? "")])),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ticketListKey,
    queryFn: () => listTickets(token!, params),
    enabled: !!token,
  });

  const {
    data: ticket,
    isLoading: tLoading,
    error: ticketError,
  } = useQuery({
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
  const { data: teams = [] } = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token!),
    enabled: !!token,
  });
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => listTags(token!),
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
  const teamMut = useMutation({
    mutationFn: (teamId: string | null) =>
      assignTicketTeam(token!, selectedId!, teamId),
    onSuccess: async (updated) => {
      toast.success("Ticket team updated");
      qc.setQueryData(queryKeys.ticket(updated.id), updated);
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      await qc.invalidateQueries({ queryKey: queryKeys.teams });
      await qc.invalidateQueries({ queryKey: ["ticket-activity", updated.id] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update ticket team")),
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

  const attachmentMut = useMutation({
    mutationFn: (file: File) => uploadTicketAttachment(token!, selectedId!, file),
    onSuccess: async () => {
      toast.success("Attachment uploaded");
      await qc.invalidateQueries({ queryKey: queryKeys.ticket(selectedId!) });
      await qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not upload attachment")),
  });

  const handleAttachmentDownload = async (attachment: Attachment) => {
    setDownloadingAttachmentId(attachment.id);
    try {
      await downloadAttachment(token!, attachment);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not download attachment"));
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || createMut.isPending) return;
    createMut.mutate();
  };

  const tickets = data?.items ?? [];
  const ticketSummary = data?.summary ?? buildTicketSummary(tickets, data?.total);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-oc-bg">
      <section
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 xl:px-8 xl:py-7",
          selectedId && "hidden lg:block",
        )}
      >
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-oc-faint">
              Support operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-oc-text">
              Support Tickets
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oc-muted">
              Manage customer issues, ownership, notes and lifecycle.
            </p>
          </div>
          <Button
            type="button"
            disabled={!canMutate}
            onClick={() => setCreating((current) => !current)}
            className="h-11 w-full gap-2 px-5 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Close form" : "New ticket"}
          </Button>
        </header>

        <Card className="mb-5 overflow-hidden p-4 md:p-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint sm:col-span-2 xl:col-span-1">
                Search
                <span className="relative mt-2 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oc-faint" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      resetPagination();
                    }}
                    placeholder="Search tickets, customers, or IDs..."
                    className="h-11 pl-10"
                    aria-label="Search tickets"
                  />
                </span>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as TicketStatus | "");
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {ticketStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Priority
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as TicketPriority | "");
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by priority"
                >
                  <option value="">All priorities</option>
                  {ticketPriorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Assignee
                <select
                  value={filterAssigneeId}
                  onChange={(event) => {
                    setFilterAssigneeId(event.target.value);
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by assignee"
                >
                  <option value="">All assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                        u.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Created Date
                <input
                  type="date"
                  value={createdDate}
                  onChange={(event) => {
                    setCreatedDate(event.target.value);
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by created date"
                />
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Updated Date
                <input
                  type="date"
                  value={updatedDate}
                  onChange={(event) => {
                    setUpdatedDate(event.target.value);
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by last updated date"
                />
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                SLA
                <select
                  value={slaStatus}
                  onChange={(event) => {
                    setSlaStatus(event.target.value as SlaStatus | "");
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by SLA status"
                >
                  <option value="">All SLA states</option>
                  {slaStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Team
                <select
                  value={teamId}
                  onChange={(event) => {
                    setTeamId(event.target.value);
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by team"
                >
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-xs font-semibold uppercase text-oc-faint">
                Tag
                <select
                  value={tagId}
                  onChange={(event) => {
                    setTagId(event.target.value);
                    resetPagination();
                  }}
                  className={fieldControlClass}
                  aria-label="Filter by tag"
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-oc-border/70 bg-oc-bg/50 px-3 py-2 text-sm text-oc-muted">
              Showing{" "}
              <span className="font-semibold text-oc-text">
                {isLoading ? "..." : tickets.length}
              </span>{" "}
              tickets
            </div>
          </div>
        </Card>

        <TicketSummaryStrip summary={ticketSummary} loading={isLoading} />

        {creating && (
          <Card className="mb-5 p-5 md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-oc-text">
                Create ticket
              </h2>
              <p className="mt-1 text-sm text-oc-muted">
                Capture a support issue and assign ownership for follow-up.
              </p>
            </div>
            <form onSubmit={submitCreate} className="grid gap-5 lg:grid-cols-2">
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
                  className={fieldControlClass}
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
                  className={fieldControlClass}
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
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center lg:col-span-2">
                <Button
                  type="submit"
                  disabled={createMut.isPending || !subject.trim()}
                  className="h-11"
                >
                  {createMut.isPending ? "Creating..." : "Create ticket"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreating(false)}
                  className="h-11"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/70 text-xs uppercase text-oc-faint">
                <tr>
                  <th className="w-[25%] px-5 py-4 font-semibold">Subject</th>
                  <th className="w-[15%] px-4 py-4 font-semibold">Status</th>
                  <th className="w-[13%] px-4 py-4 font-semibold">Priority</th>
                  <th className="w-[12%] px-4 py-4 font-semibold">Customer</th>
                  <th className="w-[16%] px-4 py-4 font-semibold">Assignee</th>
                  <th className="w-[9%] px-3 py-4 font-semibold">Updated</th>
                  <th className="w-[10%] px-4 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-oc-border/60">
                      <td className="px-4 py-4" colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))}
                {error && (
                  <tr>
                    <td className="px-4 py-8" colSpan={7}>
                      <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
                        {getErrorMessage(error, "Failed to load tickets.")}
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && !error && tickets.length === 0 && (
                  <tr>
                    <td className="px-5 py-16" colSpan={7}>
                      <EmptyTicketsState
                        filtered={Boolean(q || status || priority || filterAssigneeId || createdDate || updatedDate || slaStatus || teamId || tagId)}
                        canCreate={canMutate}
                        onCreate={() => setCreating(true)}
                        onClear={() => {
                          setQ("");
                          setStatus("");
                          setPriority("");
                          setFilterAssigneeId("");
                          setCreatedDate("");
                          setUpdatedDate("");
                          setSlaStatus("");
                          setTeamId("");
                          setTagId("");
                        }}
                      />
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

          <div className="space-y-3 p-4 lg:hidden">
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
              <EmptyTicketsState
                filtered={Boolean(q || status || priority || filterAssigneeId || createdDate || updatedDate || slaStatus || teamId || tagId)}
                canCreate={canMutate}
                onCreate={() => setCreating(true)}
                onClear={() => {
                  setQ("");
                  setStatus("");
                  setPriority("");
                  setFilterAssigneeId("");
                  setCreatedDate("");
                  setUpdatedDate("");
                  setSlaStatus("");
                  setTeamId("");
                  setTagId("");
                }}
              />
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
          {(cursorHistory.length > 0 || data?.nextCursor) && (
            <div className="flex items-center justify-between border-t border-oc-border px-4 py-3">
              <Button
                type="button"
                variant="secondary"
                disabled={cursorHistory.length === 0}
                onClick={() => {
                  const history = [...cursorHistory];
                  setCursor(history.pop() || undefined);
                  setCursorHistory(history);
                }}
              >
                Previous
              </Button>
              <span className="text-xs text-oc-muted">
                {tickets.length} tickets on this page
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={!data?.nextCursor}
                onClick={() => {
                  setCursorHistory((history) => [...history, cursor ?? ""]);
                  setCursor(data?.nextCursor ?? undefined);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </section>

      <TicketDetailPanel
        ticket={ticket}
        selectedId={selectedId}
        loading={tLoading}
        canMutate={canMutate}
        users={users}
        teams={teams}
        notes={notes}
        activity={activity}
        error={ticketError}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        onBack={() => setSelectedId(null)}
        updateMutate={(body) => updateMut.mutate(body)}
        updating={updateMut.isPending}
        teamMutate={(teamId) => teamMut.mutate(teamId)}
        updatingTeam={teamMut.isPending}
        noteMutate={() => noteMut.mutate()}
        addingNote={noteMut.isPending}
        uploadAttachment={(file) => attachmentMut.mutate(file)}
        uploadingAttachment={attachmentMut.isPending}
        downloadingAttachmentId={downloadingAttachmentId}
        downloadAttachment={handleAttachmentDownload}
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
        "cursor-pointer border-b border-oc-border/45 transition-colors hover:bg-oc-panel/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-oc-accent",
        active &&
          "bg-oc-panel/75 shadow-[inset_3px_0_0_rgba(196,181,253,0.9)]",
      )}
    >
      <td className="px-3 py-5">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-6 text-oc-text">
            {ticket.subject}
          </p>
          <p className="mt-1 truncate text-sm text-oc-muted">
            {ticket.conversation?.channel
              ? `${ticket.conversation.channel} conversation`
              : "Manual ticket"}
          </p>
          <Badge
            tone={slaTone(ticket.slaStatus)}
            className="mt-2 px-2 py-0.5 normal-case"
          >
            SLA {ticket.slaStatus.replace("_", " ")}
          </Badge>
        </div>
      </td>
      <td className="min-w-0 px-4 py-5">
        <div className="flex min-w-0 overflow-hidden">
          <Badge
            tone={statusTone(ticket.status)}
            className="max-w-full min-w-0 gap-1.5 overflow-hidden whitespace-nowrap px-2 py-0.5 text-[11px] normal-case"
          >
            <CircleDot className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{ticket.status}</span>
          </Badge>
        </div>
      </td>
      <td className="min-w-0 px-4 py-5">
        <div className="flex min-w-0 overflow-hidden">
          <Badge
            tone={priorityTone(ticket.priority)}
            className="max-w-full min-w-0 overflow-hidden whitespace-nowrap px-2 py-0.5 text-[11px] normal-case"
          >
            <span className="truncate">{ticket.priority}</span>
          </Badge>
        </div>
      </td>
      <td className="px-4 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-oc-border bg-oc-panel text-xs font-semibold text-oc-text">
            {initials(displayCustomer(ticket))}
          </span>
          <span className="truncate text-sm font-medium text-oc-text">
            {displayCustomer(ticket)}
          </span>
        </div>
      </td>
      <td className="px-4 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-oc-border bg-oc-bg text-[11px] font-semibold text-oc-muted">
            {ticket.assignee ? initials(displayAssignee(ticket.assignee)) : "—"}
          </span>
          <span
            className={cn(
              "min-w-0 truncate text-sm",
              ticket.assignee ? "font-medium text-oc-text" : "italic text-oc-faint",
            )}
            title={displayAssignee(ticket.assignee)}
          >
            {displayAssignee(ticket.assignee)}
          </span>
        </div>
      </td>
      <td className="px-3 py-5 text-sm text-oc-muted">
        {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
      </td>
      <td className="px-4 py-5 text-right">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className="h-9 gap-2 px-3"
          aria-label={`View details for ${ticket.subject}`}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
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
    <article
      className={cn(
        "w-full rounded-xl border border-oc-border bg-oc-bg-mid/80 p-4 text-left transition-colors hover:bg-oc-panel/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent",
        active &&
          "bg-oc-panel shadow-[inset_3px_0_0_rgba(196,181,253,0.9)] ring-1 ring-violet-500/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-base font-semibold leading-6 text-oc-text">
            {ticket.subject}
          </p>
          <p className="mt-1 text-xs text-oc-faint">
            Updated {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
          </p>
        </div>
        <Badge
          tone={priorityTone(ticket.priority)}
          className="px-2.5 py-1 normal-case"
        >
          {ticket.priority}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          tone={statusTone(ticket.status)}
          className="gap-1.5 px-2.5 py-1 normal-case"
        >
          <CircleDot className="h-3 w-3" />
          {ticket.status}
        </Badge>
        {ticket.conversation?.channel && (
          <Badge tone="neutral" className="normal-case">
            {ticket.conversation.channel}
          </Badge>
        )}
        <Badge tone={slaTone(ticket.slaStatus)} className="normal-case">
          SLA {ticket.slaStatus.replace("_", " ")}
        </Badge>
        <TagPills tags={ticket.tags} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-oc-muted">
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-oc-faint" />
          <span className="truncate">{displayCustomer(ticket)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-oc-faint" />
          <span className="truncate">
            Assignee: {displayAssignee(ticket.assignee)}
          </span>
        </span>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onSelect}
        className="mt-4 h-10 w-full gap-2"
        aria-label={`View details for ${ticket.subject}`}
      >
        <Eye className="h-4 w-4" />
        View details
      </Button>
    </article>
  );
}

function TicketSummaryStrip({
  summary,
  loading,
}: {
  summary: ReturnType<typeof buildTicketSummary>;
  loading: boolean;
}) {
  const items = [
    ["Total Tickets", summary.total],
    ["Open/Pending", summary.openPending],
    ["Escalated", summary.escalated],
    ["Resolved/Closed", summary.resolvedClosed],
  ] as const;

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="p-4">
          <p className="text-xs font-semibold uppercase text-oc-faint">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-oc-text">
            {loading ? "..." : value}
          </p>
        </Card>
      ))}
    </div>
  );
}

function EmptyTicketsState({
  filtered,
  canCreate,
  onCreate,
  onClear,
}: {
  filtered: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-xl border border-dashed border-oc-border bg-oc-bg/50 px-6 py-12 text-center">
      <div className="relative mb-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-oc-border bg-oc-panel text-oc-accent shadow-sm">
          <TicketIcon className="h-9 w-9" />
        </span>
        <span className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid text-oc-muted">
          <LifeBuoy className="h-5 w-5" />
        </span>
      </div>
      <p className="text-xl font-semibold text-oc-text">
        {filtered ? "No matching tickets" : "No tickets found"}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-oc-muted">
        {filtered
          ? "Try adjusting the search, status, or priority filters."
          : "Your support queue is currently empty. Create a ticket manually or from an active conversation to begin tracking customer issues."}
      </p>
      <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        <Button
          type="button"
          onClick={filtered ? onClear : onCreate}
          disabled={!filtered && !canCreate}
          className="h-11 gap-2 px-5"
        >
          {filtered ? (
            "Clear filters"
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Create ticket
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={filtered ? onCreate : undefined}
          disabled={filtered ? !canCreate : true}
          className="h-11 px-5"
        >
          {filtered ? "Create ticket" : "Tickets will appear here"}
        </Button>
      </div>
    </div>
  );
}

function ConversationMessagePreview({
  label,
  message,
  empty,
}: {
  label: string;
  message?: Message | null;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-oc-border/60 bg-oc-bg/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-oc-faint">
          {label}
        </p>
        {message?.createdAt && (
          <span className="shrink-0 text-xs text-oc-faint">
            {formatRelative(message.createdAt)}
          </span>
        )}
      </div>
      <p
        className={cn(
          "line-clamp-3 whitespace-pre-wrap text-sm leading-6",
          message ? "text-oc-text" : "text-oc-muted",
        )}
      >
        {message?.content || empty}
      </p>
    </div>
  );
}

function MetricItem({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-oc-border/60 bg-oc-bg/45 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-oc-faint">
        <span className="text-oc-accent">{icon}</span>
        {label}
      </div>
      <p className="text-sm font-semibold text-oc-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-oc-faint">{hint}</p>}
    </div>
  );
}

function TicketDetailPanel({
  ticket,
  selectedId,
  loading,
  canMutate,
  users,
  teams,
  notes,
  activity,
  error,
  noteDraft,
  setNoteDraft,
  onBack,
  updateMutate,
  updating,
  teamMutate,
  updatingTeam,
  noteMutate,
  addingNote,
  uploadAttachment,
  uploadingAttachment,
  downloadingAttachmentId,
  downloadAttachment: onDownloadAttachment,
}: {
  ticket?: Ticket;
  selectedId: string | null;
  loading: boolean;
  canMutate: boolean;
  users: AuthUser[];
  teams: Team[];
  notes: Ticket["notes"];
  activity: Ticket["activities"];
  error: unknown;
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  onBack: () => void;
  updateMutate: (body: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
  }) => void;
  updating: boolean;
  teamMutate: (teamId: string | null) => void;
  updatingTeam: boolean;
  noteMutate: () => void;
  addingNote: boolean;
  uploadAttachment: (file: File) => void;
  uploadingAttachment: boolean;
  downloadingAttachmentId: string | null;
  downloadAttachment: (attachment: Attachment) => void;
}) {
  const latestCustomerMessage = ticket?.conversation?.latestCustomerMessage;
  const latestAgentReply = ticket?.conversation?.latestAgentReply;
  const timelineItems = buildTimelineItems(
    activity,
    ticket?.conversation?.recentMessages,
  );
  const metrics = ticket?.metrics;

  return (
    <aside
      className={cn(
        "min-h-0 w-full shrink-0 border-l border-oc-border bg-oc-bg-mid/70 transition-[width,background-color] duration-200",
        selectedId
          ? "lg:w-[390px] xl:w-[430px] 2xl:w-[460px]"
          : "lg:w-[280px] xl:w-[320px]",
        !selectedId && "hidden lg:block",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-16 items-center gap-3 border-b border-oc-border bg-oc-panel/35 px-5">
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
            <p className="truncate text-base font-semibold text-oc-text">
              Ticket workspace
            </p>
            <p className="text-sm text-oc-muted">
              Status, ownership, notes, and activity
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {!selectedId && (
            <div className="rounded-xl border border-dashed border-oc-border bg-oc-panel/30 p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-oc-faint" />
              <p className="mt-3 text-sm font-semibold text-oc-text">
                Select a ticket
              </p>
              <p className="mt-2 text-sm leading-6 text-oc-muted">
                Open a ticket to update status, priority, assignee, notes, and
                activity.
              </p>
            </div>
          )}

          {selectedId && loading && (
            <div className="space-y-4">
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-44 w-full rounded-lg" />
            </div>
          )}

          {selectedId && !loading && Boolean(error) && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5 text-sm text-red-200">
              {getErrorMessage(error, "Could not load ticket details.")}
            </div>
          )}

          {ticket && !Boolean(error) && (
            <div className="space-y-5">
              <Card className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={statusTone(ticket.status)}
                    className="gap-1.5 px-2.5 py-1 normal-case"
                  >
                    <CircleDot className="h-3 w-3" />
                    {ticket.status}
                  </Badge>
                  <Badge
                    tone={priorityTone(ticket.priority)}
                    className="px-2.5 py-1 normal-case"
                  >
                    {ticket.priority}
                  </Badge>
                  <Badge
                    tone={slaTone(ticket.slaStatus)}
                    className="px-2.5 py-1 normal-case"
                  >
                    SLA {ticket.slaStatus.replace("_", " ")}
                  </Badge>
                  {ticket.team && (
                    <Badge tone="accent" className="normal-case">
                      {ticket.team.name}
                    </Badge>
                  )}
                  <TagPills tags={ticket.tags} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold leading-7 text-oc-text">
                    {ticket.subject}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-oc-muted">
                    {ticket.description || "No description provided."}
                  </p>
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-oc-faint">
                    Tags
                  </h3>
                  <p className="mt-1 text-sm text-oc-muted">
                    Classify this ticket without changing its workflow state.
                  </p>
                </div>
                <TagEditor
                  targetType="tickets"
                  targetId={ticket.id}
                  selectedTags={ticket.tags}
                  canMutate={canMutate}
                  invalidateKeys={[queryKeys.ticket(ticket.id), ["tickets"]]}
                />
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-xs font-semibold uppercase text-oc-faint">
                  Controls
                </h3>
                <div className="grid gap-4">
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
                      className={fieldControlClass}
                    >
                      {getStatusOptions(ticket.status).map((s) => (
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
                      className={fieldControlClass}
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
                      className={fieldControlClass}
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
                  <label className="block text-sm font-medium text-oc-text">
                    Team queue
                    <select
                      value={ticket.teamId ?? ""}
                      disabled={!canMutate || updatingTeam}
                      onChange={(event) =>
                        teamMutate(event.target.value || null)
                      }
                      className={fieldControlClass}
                    >
                      <option value="">No team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-xs font-semibold uppercase text-oc-faint">
                  Context
                </h3>
                <dl className="divide-y divide-oc-border/50 rounded-lg border border-oc-border/60 bg-oc-bg/40 text-sm">
                  <div className="flex justify-between gap-3 px-3 py-3">
                    <dt className="text-oc-muted">Customer</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayCustomer(ticket)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-3">
                    <dt className="text-oc-muted">Assignee</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayAssignee(ticket.assignee)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-3">
                    <dt className="text-oc-muted">Team</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {ticket.team?.name || "No team"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-3">
                    <dt className="text-oc-muted">Created by</dt>
                    <dd className="min-w-0 truncate text-oc-text">
                      {displayUser(ticket.createdBy)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 px-3 py-3">
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
                  <div className="flex justify-between gap-3 px-3 py-3">
                    <dt className="text-oc-muted">Updated</dt>
                    <dd className="text-oc-text">
                      {ticket.updatedAt ? formatRelative(ticket.updatedAt) : "—"}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card className="space-y-4 p-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-oc-faint">
                    Conversation context
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-oc-muted">
                    Linked customer messages and agent replies from the source
                    conversation.
                  </p>
                </div>
                <div className="grid gap-3">
                  <ConversationMessagePreview
                    label="Latest customer message"
                    message={latestCustomerMessage}
                    empty="No customer message found for this ticket."
                  />
                  <ConversationMessagePreview
                    label="Latest agent reply"
                    message={latestAgentReply}
                    empty="No agent reply has been sent yet."
                  />
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-oc-faint">
                    SLA health
                  </h3>
                  <p className="mt-1 text-sm text-oc-muted">
                    Current first-response and resolution timing for this ticket.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <MetricItem
                    label="SLA status"
                    value={ticket.slaStatus.replace("_", " ")}
                    icon={<Timer className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="First response due"
                    value={formatDateTime(ticket.firstResponseDueAt)}
                    hint={
                      ticket.firstRespondedAt
                        ? `Completed ${formatDateTime(ticket.firstRespondedAt)}`
                        : "Waiting for first agent reply"
                    }
                    icon={<Reply className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="Resolution due"
                    value={formatDateTime(ticket.resolutionDueAt)}
                    hint={
                      ticket.resolvedAt
                        ? `Resolved ${formatDateTime(ticket.resolvedAt)}`
                        : "Resolution target active"
                    }
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-xs font-semibold uppercase text-oc-faint">
                  Ticket metrics
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <MetricItem
                    label="Created"
                    value={formatDateTime(metrics?.createdAt ?? ticket.createdAt)}
                    icon={<Clock3 className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="Updated"
                    value={formatDateTime(metrics?.updatedAt ?? ticket.updatedAt)}
                    icon={<Clock3 className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="First response"
                    value={formatDuration(metrics?.firstResponseTimeMinutes)}
                    hint={
                      metrics?.firstResponseAt
                        ? formatDateTime(metrics.firstResponseAt)
                        : "No agent response yet"
                    }
                    icon={<Reply className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="Resolved"
                    value={formatDateTime(metrics?.resolvedAt)}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                  <MetricItem
                    label="Time open"
                    value={formatDuration(metrics?.timeOpenMinutes)}
                    icon={<Timer className="h-4 w-4" />}
                  />
                </div>
              </Card>

              <Card className="space-y-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-oc-faint">
                      Attachments
                    </h3>
                    <p className="mt-1 text-sm text-oc-muted">
                      Files shared for this support issue.
                    </p>
                  </div>
                  {canMutate && (
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm font-medium text-oc-text transition-colors hover:bg-oc-bg focus-within:outline focus-within:outline-2 focus-within:outline-oc-accent">
                      {uploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      Upload file
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
                        disabled={uploadingAttachment}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadAttachment(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                <AttachmentList
                  attachments={ticket.attachments}
                  downloadingId={downloadingAttachmentId}
                  onDownload={onDownloadAttachment}
                />
              </Card>

              <Card className="space-y-5 p-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-oc-faint">
                    Internal notes
                  </h3>
                  <p className="mt-1 text-sm text-oc-muted">
                    Private notes for the support team.
                  </p>
                </div>
                {canMutate && (
                  <div className="rounded-lg border border-oc-border bg-oc-bg/45 p-3">
                    <Textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Add an internal note..."
                      className="min-h-32 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:outline-none"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-oc-border/60 pt-3">
                      <span className="text-xs text-oc-faint">Team only</span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingNote || !noteDraft.trim()}
                        onClick={noteMutate}
                        className="h-9"
                      >
                        {addingNote ? "Adding..." : "Add note"}
                      </Button>
                    </div>
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
                        className="rounded-lg border border-oc-border bg-oc-panel/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-oc-border bg-oc-bg text-xs font-semibold text-oc-text">
                              {initials(displayUser(note.author))}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-oc-text">
                                {displayUser(note.author)}
                              </p>
                              <p className="text-xs text-oc-faint">
                                {formatRelative(note.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-md bg-oc-bg px-2 py-1 text-xs text-oc-faint">
                            Internal
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-oc-text">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-xs font-semibold uppercase text-oc-faint">
                  Activity history
                </h3>
                {!timelineItems.length ? (
                  <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-4 text-sm text-oc-muted">
                    No activity yet.
                  </p>
                ) : (
                  <div className="relative space-y-0 pl-3">
                    <span className="absolute bottom-4 left-[25px] top-4 w-px bg-oc-border/70" />
                    {timelineItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        <span
                          className={cn(
                            "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-oc-border",
                            item.kind === "customer_message" &&
                              "bg-emerald-500/20 text-emerald-200",
                            item.kind === "agent_reply" &&
                              "bg-violet-500/20 text-violet-200",
                            item.kind === "activity" &&
                              activityIconClass(item.title),
                          )}
                        >
                          {item.kind === "agent_reply" ? (
                            <Reply className="h-3.5 w-3.5" />
                          ) : item.kind === "customer_message" ? (
                            <MessageSquare className="h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1 rounded-lg border border-oc-border/60 bg-oc-bg/55 px-3 py-3 text-sm text-oc-muted">
                          <p className="font-medium text-oc-text">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-oc-faint">
                            {item.actor} ·{" "}
                            {formatRelative(item.createdAt)}
                          </p>
                          {item.content && (
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-oc-muted">
                              {item.content}
                            </p>
                          )}
                        </div>
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
