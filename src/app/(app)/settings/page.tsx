"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createWidgetInstallation,
  listWidgetInstallations,
  updateWidgetInstallation,
} from "@/api/widget";
import {
  createSavedReply,
  deleteSavedReply,
  listSavedReplies,
  updateSavedReply,
} from "@/api/saved-replies";
import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
} from "@/api/tags";
import { listAuditLogs } from "@/api/audit-logs";
import { listUsers } from "@/api/users";
import {
  createSlaPolicy,
  deleteSlaPolicy,
  listSlaPolicies,
  updateSlaPolicy,
} from "@/api/sla-policies";
import {
  createAssignmentRule,
  deleteAssignmentRule,
  listAssignmentRules,
  updateAssignmentRule,
} from "@/api/assignment-rules";
import { listTeams } from "@/api/teams";
import {
  createEmailAccount,
  deleteEmailAccount,
  listEmailAccounts,
  updateEmailAccount,
} from "@/api/email";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/constants/query-keys";
import type {
  AuditLog,
  AssignmentRule,
  AssignmentRuleConditionType,
  AssignmentRuleTargetType,
  AuthUser,
  EmailAccount,
  SavedReply,
  SlaPolicy,
  Tag,
  TicketPriority,
} from "@/types/models";

const tabs = [
  "Profile",
  "Company",
  "Team & roles",
  "Channels",
  "Widget",
  "Saved replies",
  "Tags",
  "Assignment rules",
  "SLA policies",
  "Audit logs",
  "Notifications",
] as const;

const auditActions = [
  "USER_LOGIN",
  "TICKET_CREATED",
  "TICKET_UPDATED",
  "TICKET_STATUS_CHANGED",
  "TICKET_PRIORITY_CHANGED",
  "TICKET_ASSIGNED",
  "TICKET_UNASSIGNED",
  "TICKET_TEAM_ASSIGNED",
  "TICKET_TEAM_UNASSIGNED",
  "TICKET_NOTE_ADDED",
  "CONVERSATION_STATUS_CHANGED",
  "CONVERSATION_TEAM_ASSIGNED",
  "CONVERSATION_TEAM_UNASSIGNED",
  "TAG_CREATED",
  "TAG_UPDATED",
  "TAG_DELETED",
  "TAG_ATTACHED",
  "TAG_REMOVED",
  "TEAM_CREATED",
  "TEAM_UPDATED",
  "TEAM_DELETED",
  "TEAM_MEMBER_ADDED",
  "TEAM_MEMBER_REMOVED",
  "SAVED_REPLY_CREATED",
  "SAVED_REPLY_UPDATED",
  "SAVED_REPLY_DELETED",
  "ATTACHMENT_UPLOADED",
  "ATTACHMENT_DOWNLOADED",
  "SLA_POLICY_CREATED",
  "SLA_POLICY_UPDATED",
  "SLA_POLICY_DELETED",
  "TICKET_SLA_UPDATED",
  "TICKET_SLA_BREACHED",
  "ASSIGNMENT_RULE_CREATED",
  "ASSIGNMENT_RULE_UPDATED",
  "ASSIGNMENT_RULE_DELETED",
  "TICKET_AUTO_TEAM_ASSIGNED",
  "CONVERSATION_AUTO_TEAM_ASSIGNED",
  "EMAIL_ACCOUNT_CREATED",
  "EMAIL_ACCOUNT_UPDATED",
  "EMAIL_ACCOUNT_DELETED",
  "EMAIL_RECEIVED",
  "EMAIL_SENT",
];

const auditEntityTypes = [
  "USER",
  "TICKET",
  "CONVERSATION",
  "CUSTOMER",
  "TAG",
  "TEAM",
  "SAVED_REPLY",
  "ATTACHMENT",
  "SLA_POLICY",
  "ASSIGNMENT_RULE",
  "EMAIL_ACCOUNT",
  "MESSAGE",
];

const settingsSelectClass =
  "mt-2 h-11 w-full min-w-0 rounded-xl border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent";

const formatAuditLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

const displayActor = (actor?: AuthUser | null) =>
  actor?.displayName ||
  [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") ||
  actor?.email ||
  "System";

const formatAuditTime = (value?: string) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const summarizeMetadata = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) return "No metadata";

  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3);

  if (entries.length === 0) return "No metadata";

  return entries
    .map(([key, value]) => {
      const displayValue = Array.isArray(value)
        ? value.join(", ")
        : String(value);
      return `${key}: ${displayValue}`;
    })
    .join(" · ");
};

const parseDomains = (value: string) =>
  value
    .split(/[\n,]/)
    .map((domain) => domain.trim())
    .filter(Boolean);

function buildWidgetFrameSnippet(publicKey: string) {
  const origin =
    typeof window === "undefined" ? "" : window.location.origin;

  return `<iframe src="${origin}/widget?key=${publicKey}" style="position:fixed;right:16px;bottom:16px;width:380px;height:620px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);border:0;z-index:2147483647;" title="OmniCore Chat"></iframe>`;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const widgetQuery = useQuery({
    queryKey: queryKeys.widgetInstallations,
    queryFn: () => listWidgetInstallations(token ?? ""),
    enabled: Boolean(token) && tab === "Widget",
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const installation = widgetQuery.data?.[0] ?? null;
  const [domainDraft, setDomainDraft] = useState<string | null>(null);

  const createWidgetMutation = useMutation({
    mutationFn: () =>
      createWidgetInstallation(token ?? "", {
        allowedDomains: parseDomains(domainDraft ?? ""),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.widgetInstallations,
      });
      toast.success("Widget installation created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create widget"));
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: (body: { enabled?: boolean; allowedDomains?: string[] }) =>
      updateWidgetInstallation(token ?? "", installation!.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.widgetInstallations,
      });
      toast.success("Widget settings updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not update widget"));
    },
  });

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors lg:whitespace-normal ${
                tab === t
                  ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/30"
                  : "text-oc-muted hover:bg-oc-panel/60 hover:text-oc-text"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-4">
          <header>
            <h1 className="text-lg font-semibold text-oc-text">Settings</h1>
            <p className="text-sm text-oc-muted">
              Enterprise controls — connect forms to PATCH endpoints as backend
              exposes them.
            </p>
          </header>

          {tab === "Profile" && (
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-oc-text">Profile</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-oc-faint">Display name</label>
                  <Input
                    className="mt-1"
                    defaultValue={
                      [user?.firstName, user?.lastName]
                        .filter(Boolean)
                        .join(" ")
                    }
                    disabled
                  />
                </div>
                <div>
                  <label className="text-xs text-oc-faint">Email</label>
                  <Input className="mt-1" defaultValue={user?.email} disabled />
                </div>
              </div>
              <Button type="button" disabled>
                Save changes
              </Button>
              <p className="text-xs text-oc-faint">
                {/* TODO: PATCH /users/me or /auth/profile */}
                Wire profile update API when available.
              </p>
            </Card>
          )}

          {tab === "Company" && (
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-oc-text">Company</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-oc-faint">
                    Company name
                  </label>

                  <Input
                    className="mt-1"
                    defaultValue={company?.name}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-xs text-oc-faint">
                    Company ID
                  </label>

                  <Input
                    className="mt-1"
                    defaultValue={company?.id}
                    disabled
                  />
                </div>
              </div>

              <p className="text-sm text-oc-muted">
                Company-level branding, billing, domains, and workspace controls
                will connect to future backend company management APIs.
              </p>
            </Card>
          )}

          {tab === "Team & roles" && (
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-oc-text">
                Team & roles
              </h2>
              <p className="text-sm text-oc-muted">
                Teams are now managed from the dedicated Teams module.
              </p>
              <Link
                href="/teams"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-oc-accent px-4 text-sm font-medium text-white transition-colors hover:bg-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oc-accent"
              >
                Open Teams
              </Link>
            </Card>
          )}

          {tab === "Channels" && (
            <EmailChannelsSettings token={token ?? ""} user={user} />
          )}

          {tab === "Widget" && (
            <Card className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-oc-text">
                    Website chat widget
                  </h2>
                  <p className="mt-1 text-sm text-oc-muted">
                    Create a tenant-scoped public key and allow the website
                    domains that can load it.
                  </p>
                </div>
                {installation && (
                  <Button
                    type="button"
                    variant={installation.enabled ? "danger" : "secondary"}
                    size="sm"
                    disabled={updateWidgetMutation.isPending}
                    onClick={() =>
                      updateWidgetMutation.mutate({
                        enabled: !installation.enabled,
                      })
                    }
                  >
                    {installation.enabled ? "Disable" : "Enable"}
                  </Button>
                )}
              </div>

              {widgetQuery.isLoading && (
                <p className="text-sm text-oc-muted">Loading widget...</p>
              )}

              {!widgetQuery.isLoading && !installation && (
                <div className="space-y-3">
                  <label className="text-xs text-oc-faint">
                    Allowed domains
                  </label>
                  <Textarea
                    value={domainDraft ?? ""}
                    onChange={(event) => setDomainDraft(event.target.value)}
                    placeholder="localhost:3000&#10;example.com"
                  />
                  <Button
                    type="button"
                    disabled={createWidgetMutation.isPending}
                    onClick={() => createWidgetMutation.mutate()}
                  >
                    {createWidgetMutation.isPending
                      ? "Creating..."
                      : "Create widget"}
                  </Button>
                </div>
              )}

              {installation && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-oc-faint">
                        Public key
                      </label>
                      <div className="mt-1 flex gap-2">
                        <Input value={installation.publicKey} readOnly />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            copyToClipboard(
                              installation.publicKey,
                              "Public key",
                            )
                          }
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-oc-faint">Status</label>
                      <Input
                        className="mt-1"
                        value={installation.enabled ? "Enabled" : "Disabled"}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-oc-faint">
                      Allowed domains
                    </label>
                    <Textarea
                      key={installation.id}
                      defaultValue={installation.allowedDomains.join("\n")}
                      onChange={(event) =>
                        setDomainDraft(event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={updateWidgetMutation.isPending}
                      onClick={() =>
                        updateWidgetMutation.mutate({
                          allowedDomains: parseDomains(
                            domainDraft ??
                              installation.allowedDomains.join("\n"),
                          ),
                        })
                      }
                    >
                      Save domains
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-oc-faint">
                      Local MVP embed snippet
                    </label>
                    <Textarea
                      value={buildWidgetFrameSnippet(installation.publicKey)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        copyToClipboard(
                          buildWidgetFrameSnippet(installation.publicKey),
                          "Embed snippet",
                        )
                      }
                    >
                      Copy snippet
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {tab === "Saved replies" && (
            <SavedRepliesSettings
              token={token ?? ""}
              canMutate={user?.role !== "VIEWER"}
            />
          )}

          {tab === "Tags" && (
            <TagsSettings
              token={token ?? ""}
              canMutate={user?.role !== "VIEWER"}
            />
          )}

          {tab === "Audit logs" && (
            <AuditLogsSettings token={token ?? ""} />
          )}

          {tab === "SLA policies" && (
            <SlaPoliciesSettings
              token={token ?? ""}
              canMutate={["OWNER", "ADMIN", "TEAM_LEAD"].includes(
                user?.role ?? "",
              )}
            />
          )}

          {tab === "Assignment rules" && (
            <AssignmentRulesSettings
              token={token ?? ""}
              canMutate={["OWNER", "ADMIN", "TEAM_LEAD"].includes(
                user?.role ?? "",
              )}
            />
          )}

          {tab === "Notifications" && (
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-oc-text">
                Notifications
              </h2>
              <p className="text-sm text-oc-muted">
                {/* TODO: PATCH /users/me/notification-preferences */}
                Desktop, email, and mobile push preferences.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailChannelsSettings({
  token,
  user,
}: {
  token: string;
  user: AuthUser | null;
}) {
  const qc = useQueryClient();
  const accountsQuery = useQuery({
    queryKey: queryKeys.emailAccounts,
    queryFn: () => listEmailAccounts(token),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const canManage = ["OWNER", "ADMIN", "TEAM_LEAD"].includes(user?.role ?? "");
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.emailAccounts });
  const reset = () => {
    setEditing(null);
    setFromEmail("");
    setFromName("");
  };
  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateEmailAccount(token, editing.id, {
            fromEmail,
            fromName: fromName.trim() || undefined,
          })
        : createEmailAccount(token, {
            provider: "RESEND",
            fromEmail,
            fromName: fromName.trim() || undefined,
          }),
    onSuccess: async () => {
      await refresh();
      reset();
      toast.success(editing ? "Email channel updated" : "Email channel created");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not save email channel")),
  });
  const statusMutation = useMutation({
    mutationFn: (account: EmailAccount) =>
      updateEmailAccount(token, account.id, {
        status: account.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      }),
    onSuccess: async () => {
      await refresh();
      toast.success("Email channel status updated");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update email channel")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmailAccount(token, id),
    onSuccess: async () => {
      await refresh();
      reset();
      toast.success("Email channel removed");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not remove email channel")),
  });
  const busy =
    saveMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">Email channel</h2>
          <p className="mt-1 text-sm text-oc-muted">
            Configure the tenant-owned address used for inbound and outbound
            email. Provider secrets remain on the server.
          </p>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (fromEmail.trim() && canManage && !busy) saveMutation.mutate();
          }}
        >
          <label className="text-xs font-semibold uppercase text-oc-faint">
            From email
            <Input
              className="mt-2"
              type="email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="support@example.com"
              disabled={!canManage || busy}
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            From name
            <Input
              className="mt-2"
              value={fromName}
              onChange={(event) => setFromName(event.target.value)}
              placeholder="Example Support"
              disabled={!canManage || busy}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={!canManage || busy || !fromEmail.trim()}>
              {editing ? "Save email channel" : "Add email channel"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" disabled={busy} onClick={reset}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
        <p className="text-xs text-oc-faint">
          Resend delivery requires RESEND_API_KEY and EMAIL_WEBHOOK_SECRET in
          the backend environment.
        </p>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-oc-text">Configured addresses</h3>
          <p className="mt-1 text-sm text-oc-muted">
            Email sent to an active address enters this company&apos;s inbox.
          </p>
        </div>
        {accountsQuery.isLoading && <p className="text-sm text-oc-muted">Loading...</p>}
        {accountsQuery.error && (
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(accountsQuery.error, "Could not load email channels")}
          </p>
        )}
        {!accountsQuery.isLoading &&
          !accountsQuery.error &&
          (accountsQuery.data?.length ?? 0) === 0 && (
            <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-5 text-sm text-oc-muted">
              No email channel configured yet.
            </p>
          )}
        <div className="grid gap-3">
          {(accountsQuery.data ?? []).map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-3 rounded-lg border border-oc-border bg-oc-bg/45 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-oc-text">
                  {account.fromName || account.fromEmail}
                </p>
                <p className="truncate text-sm text-oc-muted">{account.fromEmail}</p>
                <p className="mt-1 text-xs uppercase text-oc-faint">
                  {account.provider} · {account.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canManage || busy}
                  onClick={() => {
                    setEditing(account);
                    setFromEmail(account.fromEmail);
                    setFromName(account.fromName ?? "");
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!canManage || busy}
                  onClick={() => statusMutation.mutate(account)}
                >
                  {account.status === "ACTIVE" ? "Disable" : "Enable"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={!canManage || busy}
                  onClick={() => {
                    if (window.confirm("Remove this email channel?")) {
                      deleteMutation.mutate(account.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const slaPriorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function SlaPoliciesSettings({
  token,
  canMutate,
}: {
  token: string;
  canMutate: boolean;
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [firstResponseMinutes, setFirstResponseMinutes] = useState("60");
  const [resolutionMinutes, setResolutionMinutes] = useState("480");
  const [enabled, setEnabled] = useState(true);

  const policiesQuery = useQuery({
    queryKey: queryKeys.slaPolicies,
    queryFn: () => listSlaPolicies(token),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const policies = policiesQuery.data ?? [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPriority("MEDIUM");
    setFirstResponseMinutes("60");
    setResolutionMinutes("480");
    setEnabled(true);
  };

  const payload = () => ({
    name: name.trim(),
    priority,
    firstResponseMinutes: Number(firstResponseMinutes),
    resolutionMinutes: Number(resolutionMinutes),
    enabled,
  });

  const refresh = async () => {
    resetForm();
    await queryClient.invalidateQueries({ queryKey: queryKeys.slaPolicies });
  };

  const createMutation = useMutation({
    mutationFn: () => createSlaPolicy(token, payload()),
    onSuccess: async () => {
      await refresh();
      toast.success("SLA policy created");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not create SLA policy")),
  });
  const updateMutation = useMutation({
    mutationFn: () => updateSlaPolicy(token, editingId!, payload()),
    onSuccess: async () => {
      await refresh();
      toast.success("SLA policy updated");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update SLA policy")),
  });
  const deleteMutation = useMutation({
    mutationFn: (policyId: string) => deleteSlaPolicy(token, policyId),
    onSuccess: async () => {
      await refresh();
      toast.success("SLA policy deleted");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not delete SLA policy")),
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const startEdit = (policy: SlaPolicy) => {
    setEditingId(policy.id);
    setName(policy.name);
    setPriority(policy.priority);
    setFirstResponseMinutes(String(policy.firstResponseMinutes));
    setResolutionMinutes(String(policy.resolutionMinutes));
    setEnabled(policy.enabled);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !name.trim()) return;
    if (editingId) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">SLA policies</h2>
          <p className="mt-1 text-sm leading-6 text-oc-muted">
            Define first-response and resolution targets by ticket priority.
            Enabling a policy replaces the active policy for that priority.
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase text-oc-faint sm:col-span-2">
            Policy name
            <Input
              className="mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Standard medium priority"
              disabled={!canMutate || busy}
              required
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Priority
            <select
              className={settingsSelectClass}
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TicketPriority)
              }
              disabled={!canMutate || busy}
            >
              {slaPriorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-xl border border-oc-border bg-oc-panel px-3 py-3 text-sm text-oc-text">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={!canMutate || busy}
            />
            Enabled
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            First response minutes
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={firstResponseMinutes}
              onChange={(event) => setFirstResponseMinutes(event.target.value)}
              disabled={!canMutate || busy}
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Resolution minutes
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={resolutionMinutes}
              onChange={(event) => setResolutionMinutes(event.target.value)}
              disabled={!canMutate || busy}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={!canMutate || busy || !name.trim()}>
              {editingId ? "Save policy" : "Create policy"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-oc-text">Policy matrix</h3>
        {policiesQuery.isLoading && (
          <p className="text-sm text-oc-muted">Loading SLA policies...</p>
        )}
        {policiesQuery.error && (
          <p className="text-sm text-red-200">
            {getErrorMessage(policiesQuery.error, "Could not load SLA policies")}
          </p>
        )}
        {!policiesQuery.isLoading && policies.length === 0 && (
          <p className="rounded-lg border border-dashed border-oc-border p-4 text-sm text-oc-muted">
            No SLA policies yet.
          </p>
        )}
        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="rounded-lg border border-oc-border bg-oc-bg/45 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-oc-text">
                    {policy.name}
                  </p>
                  <p className="mt-1 text-sm text-oc-muted">
                    {policy.priority} · first response {policy.firstResponseMinutes}m
                    {" · "}resolution {policy.resolutionMinutes}m
                    {" · "}{policy.enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => startEdit(policy)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => {
                      if (window.confirm("Delete this SLA policy?")) {
                        deleteMutation.mutate(policy.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const ticketPriorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function AssignmentRulesSettings({
  token,
  canMutate,
}: {
  token: string;
  canMutate: boolean;
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [targetType, setTargetType] =
    useState<AssignmentRuleTargetType>("CONVERSATION");
  const [conditionType, setConditionType] =
    useState<AssignmentRuleConditionType>("CHANNEL");
  const [conditionValue, setConditionValue] = useState("WHATSAPP");
  const [teamId, setTeamId] = useState("");

  const rulesQuery = useQuery({
    queryKey: queryKeys.assignmentRules,
    queryFn: () => listAssignmentRules(token),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => listTags(token),
    enabled: Boolean(token),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });
  const rules = rulesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEnabled(true);
    setTargetType("CONVERSATION");
    setConditionType("CHANNEL");
    setConditionValue("WHATSAPP");
    setTeamId("");
  };
  const refresh = async () => {
    resetForm();
    await queryClient.invalidateQueries({ queryKey: queryKeys.assignmentRules });
  };
  const payload = () => ({
    name: name.trim(),
    enabled,
    targetType,
    conditionType,
    conditionValue,
    teamId,
  });
  const createMutation = useMutation({
    mutationFn: () => createAssignmentRule(token, payload()),
    onSuccess: async () => {
      await refresh();
      toast.success("Assignment rule created");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not create assignment rule")),
  });
  const updateMutation = useMutation({
    mutationFn: (body: ReturnType<typeof payload>) =>
      updateAssignmentRule(token, editingId!, body),
    onSuccess: async () => {
      await refresh();
      toast.success("Assignment rule updated");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update assignment rule")),
  });
  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteAssignmentRule(token, ruleId),
    onSuccess: async () => {
      await refresh();
      toast.success("Assignment rule deleted");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not delete assignment rule")),
  });
  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const chooseTarget = (next: AssignmentRuleTargetType) => {
    setTargetType(next);
    if (next === "CONVERSATION") {
      setConditionType("CHANNEL");
      setConditionValue("WHATSAPP");
    } else {
      setConditionType("PRIORITY");
      setConditionValue("MEDIUM");
    }
  };
  const chooseCondition = (next: AssignmentRuleConditionType) => {
    setConditionType(next);
    setConditionValue(next === "TAG" ? tags[0]?.id ?? "" : "MEDIUM");
  };
  const startEdit = (rule: AssignmentRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setEnabled(rule.enabled);
    setTargetType(rule.targetType);
    setConditionType(rule.conditionType);
    setConditionValue(rule.conditionValue);
    setTeamId(rule.teamId);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !name.trim() || !conditionValue || !teamId) return;
    if (editingId) updateMutation.mutate(payload());
    else createMutation.mutate();
  };
  const conditionLabel = (rule: AssignmentRule) => {
    if (rule.conditionType === "TAG") {
      return tags.find((tag) => tag.id === rule.conditionValue)?.name ?? "Tag";
    }
    return formatAuditLabel(rule.conditionValue);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">
            Assignment rules
          </h2>
          <p className="mt-1 text-sm leading-6 text-oc-muted">
            Route new conversations and tickets to the first matching team.
            Explicit manual team assignments are never replaced.
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase text-oc-faint sm:col-span-2">
            Rule name
            <Input
              className="mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="WhatsApp to Support"
              disabled={!canMutate || busy}
              required
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Target
            <select
              className={settingsSelectClass}
              value={targetType}
              onChange={(event) =>
                chooseTarget(event.target.value as AssignmentRuleTargetType)
              }
              disabled={!canMutate || busy}
            >
              <option value="CONVERSATION">Conversation</option>
              <option value="TICKET">Ticket</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Condition
            <select
              className={settingsSelectClass}
              value={conditionType}
              onChange={(event) =>
                chooseCondition(
                  event.target.value as AssignmentRuleConditionType,
                )
              }
              disabled={!canMutate || busy || targetType === "CONVERSATION"}
            >
              {targetType === "CONVERSATION" ? (
                <option value="CHANNEL">Channel</option>
              ) : (
                <>
                  <option value="PRIORITY">Priority</option>
                  <option value="TAG">Tag</option>
                </>
              )}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Matches
            <select
              className={settingsSelectClass}
              value={conditionValue}
              onChange={(event) => setConditionValue(event.target.value)}
              disabled={!canMutate || busy}
            >
              {conditionType === "CHANNEL" &&
                ["WHATSAPP", "WEBSITE"].map((value) => (
                  <option key={value} value={value}>
                    {formatAuditLabel(value)}
                  </option>
                ))}
              {conditionType === "PRIORITY" &&
                ticketPriorities.map((value) => (
                  <option key={value} value={value}>
                    {formatAuditLabel(value)}
                  </option>
                ))}
              {conditionType === "TAG" &&
                tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Assign team
            <select
              className={settingsSelectClass}
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              disabled={!canMutate || busy}
              required
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-oc-border bg-oc-panel px-3 py-3 text-sm text-oc-text">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={!canMutate || busy}
            />
            Enabled
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={!canMutate || busy || !name.trim() || !teamId}
            >
              {editingId ? "Save rule" : "Create rule"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-oc-text">Routing order</h3>
        {rulesQuery.isLoading && (
          <p className="text-sm text-oc-muted">Loading assignment rules...</p>
        )}
        {!rulesQuery.isLoading && rules.length === 0 && (
          <p className="rounded-lg border border-dashed border-oc-border p-4 text-sm text-oc-muted">
            No assignment rules yet.
          </p>
        )}
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="rounded-lg border border-oc-border bg-oc-bg/45 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-oc-text">
                    {index + 1}. {rule.name}
                  </p>
                  <p className="mt-1 text-sm text-oc-muted">
                    {formatAuditLabel(rule.targetType)} ·{" "}
                    {formatAuditLabel(rule.conditionType)} ={" "}
                    {conditionLabel(rule)} · {rule.team.name} ·{" "}
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() =>
                      updateAssignmentRule(token, rule.id, {
                        enabled: !rule.enabled,
                      })
                        .then(() => refresh())
                        .catch((error) =>
                          toast.error(
                            getErrorMessage(error, "Could not update rule"),
                          ),
                        )
                    }
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => startEdit(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => {
                      if (window.confirm("Delete this assignment rule?")) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AuditLogsSettings({ token }: { token: string }) {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const resetPagination = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const params = useMemo(
    () => ({
      action: action || undefined,
      entityType: entityType || undefined,
      actorId: actorId || undefined,
      cursor,
      limit: 30,
    }),
    [action, actorId, cursor, entityType],
  );

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs(
      Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value ?? "")]),
      ),
    ),
    queryFn: () => listAuditLogs(token, params),
    enabled: Boolean(token),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => listUsers(token),
    enabled: Boolean(token),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });

  const logs = auditQuery.data?.items ?? [];
  const users = usersQuery.data ?? [];

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-oc-text">Audit logs</h2>
        <p className="mt-1 text-sm leading-6 text-oc-muted">
          Review tenant-scoped records of important account, ticket, team, tag,
          saved reply, conversation, and attachment actions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold uppercase text-oc-faint">
          Action
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              resetPagination();
            }}
            className={settingsSelectClass}
          >
            <option value="">All actions</option>
            {auditActions.map((item) => (
              <option key={item} value={item}>
                {formatAuditLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase text-oc-faint">
          Entity
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              resetPagination();
            }}
            className={settingsSelectClass}
          >
            <option value="">All entities</option>
            {auditEntityTypes.map((item) => (
              <option key={item} value={item}>
                {formatAuditLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase text-oc-faint">
          Actor
          <select
            value={actorId}
            onChange={(event) => {
              setActorId(event.target.value);
              resetPagination();
            }}
            className={settingsSelectClass}
          >
            <option value="">All actors</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {displayActor(item)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {auditQuery.isLoading && (
        <p className="text-sm text-oc-muted">Loading audit logs...</p>
      )}

      {auditQuery.error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
          {getErrorMessage(auditQuery.error, "Could not load audit logs")}
        </div>
      )}

      {!auditQuery.isLoading && !auditQuery.error && logs.length === 0 && (
        <div className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-5 text-sm text-oc-muted">
          No audit logs match the current filters.
        </div>
      )}

      {logs.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-oc-border md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-oc-border bg-oc-bg/70 text-xs uppercase text-oc-faint">
                <tr>
                  <th className="w-[22%] px-4 py-3">Action</th>
                  <th className="w-[18%] px-4 py-3">Actor</th>
                  <th className="w-[16%] px-4 py-3">Entity</th>
                  <th className="w-[26%] px-4 py-3">Metadata</th>
                  <th className="w-[18%] px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}
          </div>
        </>
      )}

      {(cursorHistory.length > 0 || auditQuery.data?.nextCursor) && (
        <div className="flex items-center justify-between border-t border-oc-border pt-4">
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
            {logs.length} logs on this page
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={!auditQuery.data?.nextCursor}
            onClick={() => {
              setCursorHistory((history) => [...history, cursor ?? ""]);
              setCursor(auditQuery.data?.nextCursor ?? undefined);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  return (
    <tr className="border-b border-oc-border/60 last:border-b-0">
      <td className="px-4 py-4">
        <span className="font-medium text-oc-text">
          {formatAuditLabel(log.action)}
        </span>
      </td>
      <td className="px-4 py-4 text-oc-muted">{displayActor(log.actor)}</td>
      <td className="px-4 py-4">
        <p className="font-medium text-oc-text">
          {formatAuditLabel(log.entityType)}
        </p>
        <p className="truncate font-mono text-xs text-oc-faint">
          {log.entityId}
        </p>
      </td>
      <td className="px-4 py-4 text-oc-muted">
        <p className="line-clamp-2">{summarizeMetadata(log.metadata)}</p>
      </td>
      <td className="px-4 py-4 text-oc-muted">
        {formatAuditTime(log.createdAt)}
      </td>
    </tr>
  );
}

function AuditLogCard({ log }: { log: AuditLog }) {
  return (
    <div className="rounded-lg border border-oc-border bg-oc-bg/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-oc-text">
            {formatAuditLabel(log.action)}
          </p>
          <p className="mt-1 text-xs text-oc-muted">{displayActor(log.actor)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-oc-border bg-oc-panel px-2.5 py-1 text-xs text-oc-muted">
          {formatAuditLabel(log.entityType)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-oc-muted">
        {summarizeMetadata(log.metadata)}
      </p>
      <div className="mt-3 flex flex-col gap-1 text-xs text-oc-faint">
        <span className="truncate font-mono">{log.entityId}</span>
        <span>{formatAuditTime(log.createdAt)}</span>
      </div>
    </div>
  );
}

function SavedRepliesSettings({
  token,
  canMutate,
}: {
  token: string;
  canMutate: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const repliesQuery = useQuery({
    queryKey: queryKeys.savedReplies(),
    queryFn: () => listSavedReplies(token),
    enabled: Boolean(token),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });

  const replies = useMemo(() => repliesQuery.data ?? [], [repliesQuery.data]);
  const filteredReplies = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return replies;

    return replies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(needle) ||
        reply.content.toLowerCase().includes(needle),
    );
  }, [replies, search]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: () => createSavedReply(token, { title, content }),
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedReplies(),
      });
      toast.success("Saved reply created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create saved reply"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateSavedReply(token, editingId!, { title, content }),
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedReplies(),
      });
      toast.success("Saved reply updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not update saved reply"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (replyId: string) => deleteSavedReply(token, replyId),
    onSuccess: async () => {
      if (editingId) resetForm();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedReplies(),
      });
      toast.success("Saved reply deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not delete saved reply"));
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !title.trim() || !content.trim()) return;

    if (editingId) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  };

  const startEdit = (reply: SavedReply) => {
    setEditingId(reply.id);
    setTitle(reply.title);
    setContent(reply.content);
  };

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">
            Saved replies
          </h2>
          <p className="mt-1 text-sm leading-6 text-oc-muted">
            Create reusable plain-text responses that agents can insert into
            the inbox composer and edit before sending.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Title
            <Input
              className="mt-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Order status follow-up"
              disabled={!canMutate || busy}
              required
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Reply content
            <Textarea
              className="mt-2 min-h-32"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Hi, thanks for reaching out. I am checking this now and will update you shortly."
              disabled={!canMutate || busy}
              required
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={!canMutate || busy || !title.trim() || !content.trim()}
            >
              {editingId
                ? updateMutation.isPending
                  ? "Saving..."
                  : "Save reply"
                : createMutation.isPending
                  ? "Creating..."
                  : "Create reply"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel edit
              </Button>
            )}
            {!canMutate && (
              <p className="text-xs text-oc-faint">
                Viewer users can read saved replies but cannot modify them.
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-oc-text">
              Reply library
            </h3>
            <p className="mt-1 text-sm text-oc-muted">
              {replies.length} saved {replies.length === 1 ? "reply" : "replies"}
            </p>
          </div>
          <label className="min-w-0 text-xs font-semibold uppercase text-oc-faint sm:w-72">
            Search
            <Input
              className="mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find replies..."
            />
          </label>
        </div>

        {repliesQuery.isLoading && (
          <p className="text-sm text-oc-muted">Loading saved replies...</p>
        )}

        {repliesQuery.error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(repliesQuery.error, "Could not load saved replies")}
          </div>
        )}

        {!repliesQuery.isLoading &&
          !repliesQuery.error &&
          filteredReplies.length === 0 && (
            <div className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-5 text-sm text-oc-muted">
              {search.trim() ? "No saved replies match your search." : "No saved replies yet."}
            </div>
          )}

        <div className="space-y-3">
          {filteredReplies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-lg border border-oc-border bg-oc-bg/45 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-oc-text">
                    {reply.title}
                  </p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-oc-muted">
                    {reply.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => startEdit(reply)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => {
                      if (window.confirm("Delete this saved reply?")) {
                        deleteMutation.mutate(reply.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TagsSettings({
  token,
  canMutate,
}: {
  token: string;
  canMutate: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => listTags(token),
    enabled: Boolean(token),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const filteredTags = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tags;

    return tags.filter((tag) => tag.name.toLowerCase().includes(needle));
  }, [search, tags]);

  const resetForm = () => {
    setName("");
    setColor("#7c3aed");
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: () => createTag(token, { name, color }),
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not create tag"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateTag(token, editingId!, { name, color }),
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Tag updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not update tag"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tagId: string) => deleteTag(token, tagId),
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Tag deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Could not delete tag"));
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !name.trim()) return;

    if (editingId) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color ?? "#7c3aed");
  };

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">Tags</h2>
          <p className="mt-1 text-sm leading-6 text-oc-muted">
            Create tenant-scoped labels agents can apply to customers, tickets,
            and conversations.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Name
            <Input
              className="mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="VIP, Billing, Follow-up..."
              disabled={!canMutate || busy}
              required
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Color
            <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-oc-border bg-oc-panel px-3 shadow-inner">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                disabled={!canMutate || busy}
                className="h-7 w-9 shrink-0 rounded border border-oc-border bg-transparent"
                aria-label="Tag color"
              />
              <span className="font-mono text-xs text-oc-muted">{color}</span>
            </div>
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={!canMutate || busy || !name.trim()}
            >
              {editingId
                ? updateMutation.isPending
                  ? "Saving..."
                  : "Save tag"
                : createMutation.isPending
                  ? "Creating..."
                  : "Create tag"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel edit
              </Button>
            )}
            {!canMutate && (
              <p className="text-xs text-oc-faint">
                Viewer users can read tags but cannot modify them.
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-oc-text">
              Tag library
            </h3>
            <p className="mt-1 text-sm text-oc-muted">
              {tags.length} {tags.length === 1 ? "tag" : "tags"}
            </p>
          </div>
          <label className="min-w-0 text-xs font-semibold uppercase text-oc-faint sm:w-72">
            Search
            <Input
              className="mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find tags..."
            />
          </label>
        </div>

        {tagsQuery.isLoading && (
          <p className="text-sm text-oc-muted">Loading tags...</p>
        )}

        {tagsQuery.error && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(tagsQuery.error, "Could not load tags")}
          </div>
        )}

        {!tagsQuery.isLoading &&
          !tagsQuery.error &&
          filteredTags.length === 0 && (
            <div className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-5 text-sm text-oc-muted">
              {search.trim() ? "No tags match your search." : "No tags yet."}
            </div>
          )}

        <div className="grid gap-3 sm:grid-cols-2">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="rounded-lg border border-oc-border bg-oc-bg/45 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-oc-text">
                    {tag.color && (
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    <span className="truncate">{tag.name}</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-oc-faint">
                    {tag.color ?? "No color"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => startEdit(tag)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={!canMutate || busy}
                    onClick={() => {
                      if (window.confirm("Delete this tag?")) {
                        deleteMutation.mutate(tag.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
