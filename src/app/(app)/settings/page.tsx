"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const tabs = [
  "Profile",
  "Company",
  "Team & roles",
  "Channels",
  "Notifications",
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);

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
