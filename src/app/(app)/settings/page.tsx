"use client";

import { FormEvent, useRef, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
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
  listWidgetFaqEntries,
  createWidgetFaqEntry,
  updateWidgetFaqEntry,
  deleteWidgetFaqEntry,
  uploadWidgetLogo,
  removeWidgetLogo,
  uploadWidgetHero,
  removeWidgetHero,
  brandingImageUrl,
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
import {
  createUser,
  listUsers,
  resendUserInvite,
  revokeUserInvite,
  sendUserInvite,
  updateUser,
  updateUserStatus,
} from "@/api/users";
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
  UserLifecycleStatus,
  UserRole,
  WidgetFaqEntry,
  WidgetInstallation,
} from "@/types/models";
import { Permissions, hasPermission, roleLabel } from "@/lib/permissions";

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
  "USER_CREATED",
  "USER_UPDATED",
  "USER_ROLE_CHANGED",
  "USER_ACTIVATED",
  "USER_SUSPENDED",
  "USER_DEACTIVATED",
  "USER_INVITE_SENT",
  "USER_INVITE_RESENT",
  "USER_INVITE_REVOKED",
  "USER_INVITE_ACCEPTED",
  "USER_INVITE_EXPIRED",
  "USER_INVITE_INVALID_ATTEMPT",
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
  "mt-1.5 h-10 w-full min-w-0 rounded-lg border border-oc-border bg-oc-panel px-3 text-sm text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent";

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

const manageableRolesByActor: Record<string, UserRole[]> = {
  SUPER_ADMIN: ["OWNER", "ADMIN", "TEAM_LEAD", "AGENT", "VIEWER"],
  OWNER: ["OWNER", "ADMIN", "TEAM_LEAD", "AGENT", "VIEWER"],
  ADMIN: ["ADMIN", "TEAM_LEAD", "AGENT", "VIEWER"],
};

const lifecycleStatuses: UserLifecycleStatus[] = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];

const formatLifecycleStatus = (status?: UserLifecycleStatus) =>
  status ? status.toLowerCase().replace(/(^|_)(\w)/g, (_, p1, p2) => `${p1 ? " " : ""}${p2.toUpperCase()}`) : "Active";

const formatInvitationState = (value?: string) =>
  value
    ? value.toLowerCase().replace(/(^|_)(\w)/g, (_, p1, p2) => `${p1 ? " " : ""}${p2.toUpperCase()}`)
    : "None";

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

  type LandingDraft = {
    companyDisplayName: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    chatGreeting: string;
    launcherLabel: string;
    footerNote: string;
    messageShortcutsText: string;
  };
  const [landingDraft, setLandingDraft] = useState<LandingDraft | null>(null);

  // Derive effective landing values: user-edited draft takes priority;
  // fall back to installation data so inputs are pre-populated without a useEffect.
  const effectiveLanding: LandingDraft | null = landingDraft ?? (installation
    ? {
        companyDisplayName: installation.companyDisplayName ?? "",
        welcomeTitle: installation.welcomeTitle ?? "",
        welcomeSubtitle: installation.welcomeSubtitle ?? "",
        chatGreeting: installation.chatGreeting ?? "",
        launcherLabel: installation.launcherLabel ?? "",
        footerNote: installation.footerNote ?? "",
        messageShortcutsText: (installation.messageShortcuts ?? []).join("\n"),
      }
    : null);

  function patchLanding(field: keyof LandingDraft, value: string) {
    setLandingDraft((prev) => {
      const base: LandingDraft = prev ?? {
        companyDisplayName: installation?.companyDisplayName ?? "",
        welcomeTitle: installation?.welcomeTitle ?? "",
        welcomeSubtitle: installation?.welcomeSubtitle ?? "",
        chatGreeting: installation?.chatGreeting ?? "",
        launcherLabel: installation?.launcherLabel ?? "",
        footerNote: installation?.footerNote ?? "",
        messageShortcutsText: (installation?.messageShortcuts ?? []).join("\n"),
      };
      return { ...base, [field]: value };
    });
  }

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
    mutationFn: (body: {
      enabled?: boolean;
      allowedDomains?: string[];
      companyDisplayName?: string;
      welcomeTitle?: string;
      welcomeSubtitle?: string;
      chatGreeting?: string;
      launcherLabel?: string;
      footerNote?: string;
      messageShortcuts?: string[];
    }) =>
      updateWidgetInstallation(token ?? "", installation!.id, body),
    onSuccess: async () => {
      setLandingDraft(null); // allow re-init from fresh data
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

  const visibleTabs = useMemo(() => {
    const role = user?.role;

    return tabs.filter((entry) => {
      if (entry === "Team & roles") {
        return hasPermission(role, Permissions.viewUsers);
      }

      if (entry === "Channels") {
        return hasPermission(role, Permissions.manageEmailChannels);
      }

      if (entry === "Widget") {
        return hasPermission(role, Permissions.manageWidget);
      }

      if (entry === "Assignment rules") {
        return hasPermission(role, Permissions.manageAssignmentRules);
      }

      if (entry === "SLA policies") {
        return hasPermission(role, Permissions.manageSlaPolicies);
      }

      if (entry === "Audit logs") {
        return hasPermission(role, Permissions.viewAuditLogs);
      }

      if (entry === "Notifications") {
        return hasPermission(role, Permissions.manageSettings);
      }

      return true;
    });
  }, [user?.role]);

  return (
    <div className="h-full overflow-y-auto p-3 md:p-4">
      <div className="mx-auto max-w-7xl space-y-4 overflow-x-hidden">
        <nav
          aria-label="Settings sections"
          className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg border border-oc-border bg-oc-bg/40 p-1 whitespace-nowrap"
        >
          {visibleTabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-left text-[13px] whitespace-nowrap transition-colors ${
                tab === t
                  ? "bg-oc-panel text-oc-accent-2 ring-1 ring-violet-500/30"
                  : "text-oc-muted hover:bg-oc-panel/60 hover:text-oc-text"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-3">
          <header>
            <h1 className="text-base font-semibold text-oc-text">Settings</h1>
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
            <CompanyUsersSettings token={token ?? ""} user={user} />
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

                  {/* Landing page customisation */}
                  <div className="space-y-4 rounded-lg border border-oc-border bg-oc-bg/40 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-oc-text">
                        Landing page
                      </h3>
                      <p className="mt-0.5 text-xs text-oc-muted">
                        Customise the public support page visitors see at{" "}
                        <span className="font-mono">/widget?key=…</span>
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-oc-faint">
                          Company display name
                        </label>
                        <Input
                          className="mt-1"
                          placeholder="Acme Corp"
                          maxLength={120}
                          value={effectiveLanding?.companyDisplayName ?? ""}
                          onChange={(e) =>
                            patchLanding("companyDisplayName", e.target.value)
                          }
                          disabled={!effectiveLanding}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-oc-faint">
                          Launcher button label
                        </label>
                        <Input
                          className="mt-1"
                          placeholder="Chat (default)"
                          maxLength={60}
                          value={effectiveLanding?.launcherLabel ?? ""}
                          onChange={(e) =>
                            patchLanding("launcherLabel", e.target.value)
                          }
                          disabled={!effectiveLanding}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-oc-faint">
                        Welcome title
                      </label>
                      <Input
                        className="mt-1"
                        placeholder="How can we help? (default)"
                        maxLength={200}
                        value={effectiveLanding?.welcomeTitle ?? ""}
                        onChange={(e) =>
                          patchLanding("welcomeTitle", e.target.value)
                        }
                        disabled={!effectiveLanding}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-oc-faint">
                        Welcome subtitle
                      </label>
                      <Textarea
                        className="mt-1"
                        placeholder="Start a conversation and we'll get back to you as soon as possible. (default)"
                        maxLength={400}
                        value={effectiveLanding?.welcomeSubtitle ?? ""}
                        onChange={(e) =>
                          patchLanding("welcomeSubtitle", e.target.value)
                        }
                        disabled={!effectiveLanding}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-oc-faint">
                        Chat greeting
                      </label>
                      <Input
                        className="mt-1"
                        placeholder="Hi there (default)"
                        maxLength={200}
                        value={effectiveLanding?.chatGreeting ?? ""}
                        onChange={(e) =>
                          patchLanding("chatGreeting", e.target.value)
                        }
                        disabled={!effectiveLanding}
                      />
                      <p className="mt-1 text-xs text-oc-faint">
                        Shown inside the chat panel when a visitor opens the widget.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-oc-faint">
                        Message shortcuts
                      </label>
                      <Textarea
                        className="mt-1 font-mono text-xs"
                        placeholder={"I need help\nI have a billing issue\nI want to speak to support"}
                        value={effectiveLanding?.messageShortcutsText ?? ""}
                        onChange={(e) =>
                          patchLanding("messageShortcutsText", e.target.value)
                        }
                        disabled={!effectiveLanding}
                      />
                      <p className="mt-1 text-xs text-oc-faint">
                        One shortcut per line. Maximum 6. Shown as quick-reply chips in the chat.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-oc-faint">
                        Footer note
                      </label>
                      <Input
                        className="mt-1"
                        placeholder="Optional footer note on the landing page"
                        maxLength={400}
                        value={effectiveLanding?.footerNote ?? ""}
                        onChange={(e) =>
                          patchLanding("footerNote", e.target.value)
                        }
                        disabled={!effectiveLanding}
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={updateWidgetMutation.isPending || !effectiveLanding}
                      onClick={() => {
                        if (!effectiveLanding) return;
                        const shortcuts = effectiveLanding.messageShortcutsText
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .slice(0, 6);
                        updateWidgetMutation.mutate({
                          companyDisplayName: effectiveLanding.companyDisplayName,
                          welcomeTitle: effectiveLanding.welcomeTitle,
                          welcomeSubtitle: effectiveLanding.welcomeSubtitle,
                          chatGreeting: effectiveLanding.chatGreeting,
                          launcherLabel: effectiveLanding.launcherLabel,
                          footerNote: effectiveLanding.footerNote,
                          messageShortcuts: shortcuts,
                        });
                      }}
                    >
                      {updateWidgetMutation.isPending
                        ? "Saving…"
                        : "Save landing page"}
                    </Button>
                  </div>
                </div>
              )}

              {/* FAQ management */}
              {installation && (
                <WidgetFaqSettings
                  token={token ?? ""}
                  installationId={installation.id}
                />
              )}

              {/* Branding management */}
              {installation && (
                <WidgetBrandingSettings
                  token={token ?? ""}
                  installation={installation}
                />
              )}
            </Card>
          )}

          {tab === "Saved replies" && (
            <SavedRepliesSettings
              token={token ?? ""}
              canMutate={hasPermission(user?.role, Permissions.manageSavedReplies)}
            />
          )}

          {tab === "Tags" && (
            <TagsSettings
              token={token ?? ""}
              canMutate={hasPermission(user?.role, Permissions.manageTags)}
            />
          )}

          {tab === "Audit logs" && (
            <AuditLogsSettings token={token ?? ""} />
          )}

          {tab === "SLA policies" && (
            <SlaPoliciesSettings
              token={token ?? ""}
              canMutate={hasPermission(user?.role, Permissions.manageSlaPolicies)}
            />
          )}

          {tab === "Assignment rules" && (
            <AssignmentRulesSettings
              token={token ?? ""}
              canMutate={hasPermission(
                user?.role,
                Permissions.manageAssignmentRules,
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

function CompanyUsersSettings({
  token,
  user,
}: {
  token: string;
  user: AuthUser | null;
}) {
  const qc = useQueryClient();
  const canManage = hasPermission(user?.role, Permissions.manageUsers);
  const allowedRoles = manageableRolesByActor[user?.role ?? ""] ?? [];
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserLifecycleStatus | "ALL">("ALL");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(allowedRoles[0] ?? "AGENT");
  const [status, setStatus] = useState<UserLifecycleStatus>("INVITED");

  const actionButtonClass = "h-8 px-2.5 text-xs cursor-pointer disabled:cursor-not-allowed";

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => listUsers(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: () => listTeams(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const refreshUsers = () =>
    qc.invalidateQueries({
      queryKey: queryKeys.users,
    });

  const resetForm = () => {
    setEditingUserId(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setShowTemporaryPassword(false);
    setRole(allowedRoles[0] ?? "AGENT");
    setStatus("INVITED");
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (editingUserId) {
        const existing = (usersQuery.data ?? []).find((item) => item.id === editingUserId);

        const updated = await updateUser(token, editingUserId, {
          firstName,
          lastName,
          email,
          role,
        });

        if (existing && (existing.status ?? "ACTIVE") !== status) {
          await updateUserStatus(token, editingUserId, status);
        }

        return updated;
      }

      return createUser(token, {
        firstName,
        lastName,
        email,
        password,
        role,
        status,
      });
    },
    onSuccess: async () => {
      await refreshUsers();
      resetForm();
      toast.success(editingUserId ? "User updated" : "User created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not save user"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      nextStatus,
    }: {
      userId: string;
      nextStatus: UserLifecycleStatus;
    }) => updateUserStatus(token, userId, nextStatus),
    onSuccess: async () => {
      await refreshUsers();
      toast.success("User status updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update user status"));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({
      userId,
      action,
    }: {
      userId: string;
      action: "send" | "resend" | "revoke";
    }) => {
      if (action === "resend") {
        return resendUserInvite(token, userId);
      }

      if (action === "revoke") {
        return revokeUserInvite(token, userId);
      }

      return sendUserInvite(token, userId);
    },
    onSuccess: async (_result, variables) => {
      await refreshUsers();
      const actionMessage =
        variables.action === "resend"
          ? "Invite resent"
          : variables.action === "revoke"
            ? "Invite revoked"
            : "Invite sent";
      toast.success(actionMessage);
    },
    onError: (error, variables) => {
      const actionMessage =
        variables.action === "resend"
          ? "Could not resend invite"
          : variables.action === "revoke"
            ? "Could not revoke invite"
            : "Could not send invite";
      toast.error(getErrorMessage(error, actionMessage));
    },
  });

  const isStatusActionLoading = (
    userId: string,
    nextStatus: UserLifecycleStatus,
  ) =>
    statusMutation.isPending &&
    statusMutation.variables?.userId === userId &&
    statusMutation.variables?.nextStatus === nextStatus;

  const isInviteActionLoading = (
    userId: string,
    action: "send" | "resend" | "revoke",
  ) =>
    inviteMutation.isPending &&
    inviteMutation.variables?.userId === userId &&
    inviteMutation.variables?.action === action;

  const filteredUsers = useMemo(() => {
    const source = usersQuery.data ?? [];
    const query = search.trim().toLowerCase();

    return source.filter((item) => {
      const itemStatus = item.status ?? "ACTIVE";
      const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
      const matchesSearch =
        !query ||
        item.email.toLowerCase().includes(query) ||
        fullName.includes(query);
      const matchesRole = roleFilter === "ALL" || item.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" || itemStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersQuery.data, search, roleFilter, statusFilter]);

  const teamNamesByUserId = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const team of teamsQuery.data ?? []) {
      for (const member of team.members ?? []) {
        const existing = map.get(member.id) ?? [];
        existing.push(team.name);
        map.set(member.id, existing);
      }
    }

    for (const [userId, names] of map.entries()) {
      const uniqueNames = Array.from(new Set(names)).sort((a, b) =>
        a.localeCompare(b),
      );
      map.set(userId, uniqueNames);
    }

    return map;
  }, [teamsQuery.data]);

  const canManageTarget = (target: AuthUser) => {
    if (!canManage || !user) return false;
    if (target.id === user.id) return false;
    if (user.role === "ADMIN" && target.role === "OWNER") return false;
    return true;
  };

  const roleOptions =
    allowedRoles.length > 0
      ? allowedRoles
      : (["AGENT", "VIEWER"] as UserRole[]);

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-oc-text">Company users</h2>
          <p className="mt-1 text-sm text-oc-muted">
            Create, update roles, and manage lifecycle status for users in your
            company workspace.
          </p>
        </div>

        {!canManage && (
          <p className="rounded-lg border border-oc-border bg-oc-bg/40 p-3 text-sm text-oc-muted">
            You have read-only access to users.
          </p>
        )}

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canManage || upsertMutation.isPending) return;
            if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
            if (!editingUserId && password.trim().length < 8) {
              toast.error("Password must be at least 8 characters");
              return;
            }
            upsertMutation.mutate();
          }}
        >
          <label className="text-xs font-semibold uppercase text-oc-faint">
            First name
            <Input
              className="mt-2"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={!canManage || upsertMutation.isPending}
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Last name
            <Input
              className="mt-2"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={!canManage || upsertMutation.isPending}
            />
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Email
            <Input
              className="mt-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!canManage || upsertMutation.isPending}
            />
          </label>
          {!editingUserId && (
            <label className="text-xs font-semibold uppercase text-oc-faint">
              Temporary password
              <Input
                className="mt-2"
                type={showTemporaryPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                endAdornment={
                  <button
                    type="button"
                    onClick={() =>
                      setShowTemporaryPassword((current) => !current)
                    }
                    className="rounded-md p-1 text-oc-muted transition hover:text-oc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-oc-accent"
                    aria-label={
                      showTemporaryPassword
                        ? "Hide temporary password"
                        : "Show temporary password"
                    }
                    disabled={!canManage || upsertMutation.isPending}
                  >
                    {showTemporaryPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                disabled={!canManage || upsertMutation.isPending}
              />
            </label>
          )}
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Role
            <select
              className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-bg px-3 text-sm text-oc-text cursor-pointer disabled:cursor-not-allowed"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              disabled={!canManage || upsertMutation.isPending}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {roleLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-oc-faint">
            Status
            <select
              className="mt-2 h-10 w-full rounded-lg border border-oc-border bg-oc-bg px-3 text-sm text-oc-text cursor-pointer disabled:cursor-not-allowed"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as UserLifecycleStatus)
              }
              disabled={!canManage || upsertMutation.isPending}
            >
              {lifecycleStatuses.map((option) => (
                <option key={option} value={option}>
                  {formatLifecycleStatus(option)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="submit"
              className={actionButtonClass}
              disabled={!canManage || upsertMutation.isPending}
            >
              {upsertMutation.isPending
                ? editingUserId
                  ? "Saving..."
                  : "Creating..."
                : editingUserId
                  ? "Save user"
                  : "Create user"}
            </Button>
            {editingUserId && (
              <Button
                type="button"
                variant="secondary"
                className={actionButtonClass}
                disabled={upsertMutation.isPending}
                onClick={resetForm}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
          />
          <select
            className="h-10 rounded-lg border border-oc-border bg-oc-bg px-3 text-sm text-oc-text cursor-pointer"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | "ALL")}
          >
            <option value="ALL">All roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="TEAM_LEAD">Supervisor</option>
            <option value="AGENT">Agent</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <select
            className="h-10 rounded-lg border border-oc-border bg-oc-bg px-3 text-sm text-oc-text cursor-pointer"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as UserLifecycleStatus | "ALL")
            }
          >
            <option value="ALL">All statuses</option>
            {lifecycleStatuses.map((option) => (
              <option key={option} value={option}>
                {formatLifecycleStatus(option)}
              </option>
            ))}
          </select>
        </div>

        {usersQuery.isLoading && (
          <p className="text-sm text-oc-muted">Loading users...</p>
        )}
        {usersQuery.error && (
          <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200">
            {getErrorMessage(usersQuery.error, "Could not load users")}
          </p>
        )}

        {!usersQuery.isLoading && !usersQuery.error && (
          <div className="space-y-2">
            {filteredUsers.map((item) => {
              const itemStatus = item.status ?? "ACTIVE";
              const invitationState = item.invitationState ?? "NONE";
              const manageable = canManageTarget(item);

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-oc-border bg-oc-bg/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-oc-text">
                      {item.firstName} {item.lastName}
                    </p>
                    <p className="truncate text-sm text-oc-muted">{item.email}</p>
                    <p className="mt-1 text-xs uppercase text-oc-faint">
                      {roleLabel(item.role)} · {formatLifecycleStatus(itemStatus)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(teamNamesByUserId.get(item.id) ?? []).slice(0, 3).map((teamName) => (
                        <span
                          key={`${item.id}-${teamName}`}
                          className="max-w-full truncate rounded-full border border-oc-border bg-oc-panel px-2 py-0.5 text-[11px] font-medium text-oc-muted"
                          title={teamName}
                        >
                          {teamName}
                        </span>
                      ))}
                      {(teamNamesByUserId.get(item.id)?.length ?? 0) > 3 && (
                        <span className="rounded-full border border-oc-border bg-oc-panel px-2 py-0.5 text-[11px] font-medium text-oc-muted">
                          +{(teamNamesByUserId.get(item.id)?.length ?? 0) - 3} more
                        </span>
                      )}
                      {(teamNamesByUserId.get(item.id)?.length ?? 0) === 0 && (
                        <span className="rounded-full border border-dashed border-oc-border px-2 py-0.5 text-[11px] text-oc-faint">
                          No teams
                        </span>
                      )}
                    </div>
                    {itemStatus === "INVITED" && (
                      <p className="mt-1 text-xs uppercase text-oc-faint">
                        Invite: {formatInvitationState(invitationState)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className={actionButtonClass}
                      disabled={!manageable || upsertMutation.isPending}
                      onClick={() => {
                        setEditingUserId(item.id);
                        setFirstName(item.firstName);
                        setLastName(item.lastName);
                        setEmail(item.email);
                        setRole(item.role);
                        setStatus(itemStatus);
                        setPassword("");
                      }}
                    >
                      Edit
                    </Button>

                    {itemStatus === "INVITED" && invitationState === "PENDING" && (
                      <Button
                        type="button"
                        size="sm"
                        className={actionButtonClass}
                        disabled={!manageable || isInviteActionLoading(item.id, "resend")}
                        onClick={() =>
                          inviteMutation.mutate({
                            userId: item.id,
                            action: "resend",
                          })
                        }
                      >
                        {isInviteActionLoading(item.id, "resend")
                          ? "Resending..."
                          : "Resend invite"}
                      </Button>
                    )}

                    {itemStatus === "INVITED" && invitationState === "PENDING" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className={actionButtonClass}
                        disabled={!manageable || isInviteActionLoading(item.id, "revoke")}
                        onClick={() =>
                          inviteMutation.mutate({
                            userId: item.id,
                            action: "revoke",
                          })
                        }
                      >
                        {isInviteActionLoading(item.id, "revoke")
                          ? "Revoking..."
                          : "Revoke invite"}
                      </Button>
                    )}

                    {itemStatus === "INVITED" && invitationState !== "PENDING" && (
                      <Button
                        type="button"
                        size="sm"
                        className={actionButtonClass}
                        disabled={!manageable || isInviteActionLoading(item.id, "send")}
                        onClick={() =>
                          inviteMutation.mutate({
                            userId: item.id,
                            action: "send",
                          })
                        }
                      >
                        {isInviteActionLoading(item.id, "send")
                          ? "Sending..."
                          : "Send invite"}
                      </Button>
                    )}

                    {itemStatus !== "ACTIVE" && itemStatus !== "INVITED" && (
                      <Button
                        type="button"
                        size="sm"
                        className={actionButtonClass}
                        disabled={!manageable || isStatusActionLoading(item.id, "ACTIVE")}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: item.id,
                            nextStatus: "ACTIVE",
                          })
                        }
                      >
                        {isStatusActionLoading(item.id, "ACTIVE")
                          ? "Activating..."
                          : "Activate"}
                      </Button>
                    )}

                    {itemStatus === "ACTIVE" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className={actionButtonClass}
                        disabled={!manageable || isStatusActionLoading(item.id, "SUSPENDED")}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: item.id,
                            nextStatus: "SUSPENDED",
                          })
                        }
                      >
                        {isStatusActionLoading(item.id, "SUSPENDED")
                          ? "Suspending..."
                          : "Suspend"}
                      </Button>
                    )}

                    {itemStatus !== "DEACTIVATED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className={actionButtonClass}
                        disabled={!manageable || isStatusActionLoading(item.id, "DEACTIVATED")}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: item.id,
                            nextStatus: "DEACTIVATED",
                          })
                        }
                      >
                        {isStatusActionLoading(item.id, "DEACTIVATED")
                          ? "Deactivating..."
                          : "Deactivate"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <p className="rounded-lg border border-dashed border-oc-border bg-oc-bg/40 p-5 text-sm text-oc-muted">
                No users match the current filters.
              </p>
            )}
          </div>
        )}
      </Card>
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
  const canManage = hasPermission(user?.role, Permissions.manageEmailChannels);
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

// ===== Widget FAQ Management =====

function WidgetFaqSettings({
  token,
  installationId,
}: {
  token: string;
  installationId: string;
}) {
  const queryClient = useQueryClient();
  const faqQuery = useQuery({
    queryKey: queryKeys.widgetFaqEntries(installationId),
    queryFn: () => listWidgetFaqEntries(token, installationId),
    enabled: Boolean(token && installationId),
  });
  const entries: WidgetFaqEntry[] = faqQuery.data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.widgetFaqEntries(installationId),
    });

  const createMutation = useMutation({
    mutationFn: (body: { question: string; answer: string; sortOrder: number }) =>
      createWidgetFaqEntry(token, installationId, body),
    onSuccess: async () => {
      await invalidate();
      setShowAdd(false);
      setNewQ("");
      setNewA("");
      toast.success("FAQ entry added");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Could not add FAQ")),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      question?: string;
      answer?: string;
      sortOrder?: number;
    }) => updateWidgetFaqEntry(token, installationId, id, body),
    onSuccess: async () => {
      await invalidate();
      setEditingId(null);
      toast.success("FAQ entry updated");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Could not update FAQ")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWidgetFaqEntry(token, installationId, id),
    onSuccess: async () => {
      await invalidate();
      toast.success("FAQ entry deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Could not delete FAQ")),
  });

  function startEdit(entry: WidgetFaqEntry) {
    setEditingId(entry.id);
    setEditQ(entry.question);
    setEditA(entry.answer);
    setShowAdd(false);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const a = entries[index];
    const b = entries[index - 1];
    await Promise.all([
      updateMutation.mutateAsync({ id: a.id, sortOrder: b.sortOrder }),
      updateMutation.mutateAsync({ id: b.id, sortOrder: a.sortOrder }),
    ]);
  }

  async function handleMoveDown(index: number) {
    if (index === entries.length - 1) return;
    const a = entries[index];
    const b = entries[index + 1];
    await Promise.all([
      updateMutation.mutateAsync({ id: a.id, sortOrder: b.sortOrder }),
      updateMutation.mutateAsync({ id: b.id, sortOrder: a.sortOrder }),
    ]);
  }

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4 rounded-lg border border-oc-border bg-oc-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-oc-text">FAQ</h3>
          <p className="mt-0.5 text-xs text-oc-muted">
            Shown on the public support landing page as an accordion.
          </p>
        </div>
        {!showAdd && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setShowAdd(true);
              setEditingId(null);
            }}
          >
            Add question
          </Button>
        )}
      </div>

      {faqQuery.isLoading && (
        <p className="text-xs text-oc-muted">Loading FAQ…</p>
      )}

      {!faqQuery.isLoading && entries.length === 0 && !showAdd && (
        <p className="text-xs text-oc-faint">
          No FAQ entries yet. Click &quot;Add question&quot; to get started.
        </p>
      )}

      {/* Existing entries */}
      <div className="space-y-2">
        {entries.map((entry, index) =>
          editingId === entry.id ? (
            <div
              key={entry.id}
              className="space-y-2 rounded-lg border border-oc-accent-2/30 bg-oc-panel/80 p-3"
            >
              <div>
                <label className="text-xs text-oc-faint">Question</label>
                <Input
                  className="mt-1"
                  value={editQ}
                  maxLength={300}
                  onChange={(e) => setEditQ(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-oc-faint">Answer</label>
                <Textarea
                  className="mt-1"
                  value={editA}
                  maxLength={1000}
                  onChange={(e) => setEditA(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={updateMutation.isPending || !editQ.trim() || !editA.trim()}
                  onClick={() =>
                    updateMutation.mutate({
                      id: entry.id,
                      question: editQ.trim(),
                      answer: editA.trim(),
                    })
                  }
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={updateMutation.isPending}
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={entry.id}
              className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-oc-border bg-oc-panel/60 p-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-xs font-semibold text-oc-text">
                  {entry.question}
                </p>
                <p className="line-clamp-2 text-xs text-oc-muted">
                  {entry.answer}
                </p>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:shrink-0 w-full sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy || index === 0}
                  onClick={() => handleMoveUp(index)}
                  aria-label="Move up"
                  className="w-full sm:w-auto"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy || index === entries.length - 1}
                  onClick={() => handleMoveDown(index)}
                  aria-label="Move down"
                  className="w-full sm:w-auto"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => startEdit(entry)}
                  className="w-full sm:w-auto"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="w-full sm:w-auto"
                >
                  {deleteMutation.isPending && deleteMutation.variables === entry.id
                    ? "Deleting…"
                    : "Delete"}
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="space-y-2 rounded-lg border border-oc-accent-2/30 bg-oc-panel/80 p-3">
          <p className="text-xs font-semibold text-oc-text">New question</p>
          <div>
            <label className="text-xs text-oc-faint">Question</label>
            <Input
              className="mt-1"
              placeholder="e.g. How long does support take?"
              value={newQ}
              maxLength={300}
              onChange={(e) => setNewQ(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-oc-faint">Answer</label>
            <Textarea
              className="mt-1"
              placeholder="e.g. Usually within 24 hours."
              value={newA}
              maxLength={1000}
              onChange={(e) => setNewA(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={createMutation.isPending || !newQ.trim() || !newA.trim()}
              onClick={() =>
                createMutation.mutate({
                  question: newQ.trim(),
                  answer: newA.trim(),
                  sortOrder: entries.length * 10,
                })
              }
            >
              {createMutation.isPending ? "Adding…" : "Add FAQ"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={createMutation.isPending}
              onClick={() => {
                setShowAdd(false);
                setNewQ("");
                setNewA("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Widget Branding Settings =====

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

function WidgetBrandingSettings({
  token,
  installation,
}: {
  token: string;
  installation: WidgetInstallation;
}) {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [colorDraft, setColorDraft] = useState(installation.brandColor ?? "");
  const [colorError, setColorError] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.widgetInstallations });

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadWidgetLogo(token, installation.id, file),
    onSuccess: async () => { await invalidate(); toast.success("Logo uploaded"); },
    onError: (err) => toast.error(getErrorMessage(err, "Logo upload failed")),
  });

  const removeLogoMutation = useMutation({
    mutationFn: () => removeWidgetLogo(token, installation.id),
    onSuccess: async () => { await invalidate(); toast.success("Logo removed"); },
    onError: (err) => toast.error(getErrorMessage(err, "Could not remove logo")),
  });

  const heroMutation = useMutation({
    mutationFn: (file: File) => uploadWidgetHero(token, installation.id, file),
    onSuccess: async () => { await invalidate(); toast.success("Hero image uploaded"); },
    onError: (err) => toast.error(getErrorMessage(err, "Hero upload failed")),
  });

  const removeHeroMutation = useMutation({
    mutationFn: () => removeWidgetHero(token, installation.id),
    onSuccess: async () => { await invalidate(); toast.success("Hero image removed"); },
    onError: (err) => toast.error(getErrorMessage(err, "Could not remove hero")),
  });

  const colorMutation = useMutation({
    mutationFn: (color: string | null) =>
      updateWidgetInstallation(token, installation.id, { brandColor: color }),
    onSuccess: async () => { await invalidate(); toast.success("Brand color saved"); },
    onError: (err) => toast.error(getErrorMessage(err, "Could not save color")),
  });

  const busy =
    logoMutation.isPending ||
    removeLogoMutation.isPending ||
    heroMutation.isPending ||
    removeHeroMutation.isPending ||
    colorMutation.isPending;

  function handleFileInput(
    e: React.ChangeEvent<HTMLInputElement>,
    mutate: (f: File) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    mutate(file);
    e.target.value = "";
  }

  function handleColorSave() {
    if (colorDraft === "") {
      colorMutation.mutate(null);
      return;
    }
    if (!HEX_REGEX.test(colorDraft)) {
      setColorError("Must be a valid HEX color (#RRGGBB)");
      return;
    }
    setColorError("");
    colorMutation.mutate(colorDraft);
  }

  const logoSrc = brandingImageUrl(installation.logoUrl);
  const heroSrc = brandingImageUrl(installation.heroImageUrl);
  const previewColor = HEX_REGEX.test(colorDraft) ? colorDraft : installation.brandColor ?? null;

  return (
    <div className="space-y-4 rounded-lg border border-oc-border bg-oc-bg/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-oc-text">Branding</h3>
        <p className="mt-0.5 text-xs text-oc-muted">
          Logo, hero image, and accent color shown on your public support page.
        </p>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-oc-text">Company logo</p>
        {logoSrc && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Company logo"
              className="h-12 max-w-[160px] rounded border border-oc-border object-contain"
            />
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => removeLogoMutation.mutate()}
            >
              {removeLogoMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </div>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-label="Upload logo"
          className="hidden"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => handleFileInput(e, logoMutation.mutate)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => logoInputRef.current?.click()}
        >
          {logoMutation.isPending ? "Uploading…" : logoSrc ? "Replace logo" : "Upload logo"}
        </Button>
        <p className="text-xs text-oc-faint">JPEG, PNG or WebP. Max 2 MB.</p>
      </div>

      {/* Hero image */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-oc-text">Hero / banner image</p>
        {heroSrc && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt="Hero banner"
              className="h-24 w-full rounded border border-oc-border object-cover"
            />
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => removeHeroMutation.mutate()}
            >
              {removeHeroMutation.isPending ? "Removing…" : "Remove hero"}
            </Button>
          </div>
        )}
        <input
          ref={heroInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-label="Upload hero image"
          className="hidden"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => handleFileInput(e, heroMutation.mutate)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => heroInputRef.current?.click()}
        >
          {heroMutation.isPending ? "Uploading…" : heroSrc ? "Replace hero" : "Upload hero"}
        </Button>
        <p className="text-xs text-oc-faint">JPEG, PNG or WebP. Max 2 MB. Displayed as a wide banner.</p>
      </div>

      {/* Brand color */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-oc-text">Brand accent color</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={previewColor ?? "#7C3AED"}
              className="h-9 w-9 cursor-pointer rounded border border-oc-border bg-transparent p-0.5"
              onChange={(e) => {
                setColorDraft(e.target.value);
                setColorError("");
              }}
            />
          </div>
          <Input
            className="w-32"
            placeholder="#7C3AED"
            value={colorDraft}
            maxLength={7}
            onChange={(e) => {
              setColorDraft(e.target.value);
              setColorError("");
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={handleColorSave}
          >
            {colorMutation.isPending ? "Saving…" : "Save color"}
          </Button>
          {installation.brandColor && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setColorDraft("");
                colorMutation.mutate(null);
              }}
            >
              Reset
            </Button>
          )}
        </div>
        {colorError && <p className="text-xs text-red-400">{colorError}</p>}
        {/* Live preview swatch */}
        {previewColor && (
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full border border-oc-border"
              style={{ backgroundColor: previewColor }}
            />
            <p className="text-xs text-oc-faint">Preview: {previewColor}</p>
          </div>
        )}
        <p className="text-xs text-oc-faint">Used for buttons, links, and FAQ accents on the public page.</p>
      </div>
    </div>
  );
}
