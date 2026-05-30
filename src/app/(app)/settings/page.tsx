"use client";

import { useState } from "react";
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
import { getErrorMessage } from "@/api/errors";

const tabs = [
  "Profile",
  "Company",
  "Team & roles",
  "Channels",
  "Widget",
  "Notifications",
] as const;

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
    queryKey: ["widget-installations"],
    queryFn: () => listWidgetInstallations(token ?? ""),
    enabled: Boolean(token),
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
        queryKey: ["widget-installations"],
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
        queryKey: ["widget-installations"],
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
                {/* TODO: RBAC matrix + invitations */}
                Invite flows and RBAC management will integrate with future
                company administration APIs.
              </p>
            </Card>
          )}

          {tab === "Channels" && (
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-oc-text">
                Channel integrations
              </h2>
              <p className="text-sm text-oc-muted">
                {/* TODO: WhatsApp / email provider setup endpoints */}
                WhatsApp Business, email transports, and SMS — connect to
                channels module when ready.
              </p>
            </Card>
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
