"use client";

import { useEffect, useState } from "react";
import { bootstrapWidget } from "@/api/widget";
import { WidgetClient } from "./widget-client";

type BootstrapConfig = Awaited<ReturnType<typeof bootstrapWidget>>;

const WIDGET_DEFAULTS = {
  welcomeTitle: "How can we help?",
  welcomeSubtitle:
    "Start a conversation and we'll get back to you as soon as possible.",
  chatGreeting: "Hi there",
  launcherLabel: "Chat",
  messageShortcuts: [
    "I need help",
    "I want to make a complaint",
    "I have a billing issue",
    "I want to speak to support",
  ],
} as const;

type WidgetLandingProps = {
  publicKey: string;
};

export function WidgetLanding({ publicKey }: WidgetLandingProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    publicKey ? "loading" : "unavailable",
  );
  const [config, setConfig] = useState<BootstrapConfig | null>(null);

  useEffect(() => {
    // Initial state already set to "unavailable" when publicKey is empty.
    if (!publicKey) return;

    let cancelled = false;

    bootstrapWidget(publicKey)
      .then((cfg) => {
        if (!cancelled) {
          setConfig(cfg);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  if (status === "loading") {
    return <WidgetLoadingShell />;
  }

  if (status === "unavailable" || !config) {
    return <WidgetUnavailable />;
  }

  const companyName = config.companyDisplayName?.trim() || null;
  const welcomeTitle =
    config.welcomeTitle?.trim() || WIDGET_DEFAULTS.welcomeTitle;
  const welcomeSubtitle =
    config.welcomeSubtitle?.trim() || WIDGET_DEFAULTS.welcomeSubtitle;
  const footerNote = config.footerNote?.trim() || null;
  const chatGreeting =
    config.chatGreeting?.trim() || WIDGET_DEFAULTS.chatGreeting;
  const launcherLabel =
    config.launcherLabel?.trim() || WIDGET_DEFAULTS.launcherLabel;
  const messageShortcuts =
    config.messageShortcuts && config.messageShortcuts.length > 0
      ? config.messageShortcuts
      : [...WIDGET_DEFAULTS.messageShortcuts];

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-oc-bg text-oc-text">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.15),transparent_40%),radial-gradient(circle_at_80%_5%,rgba(52,211,153,0.10),transparent_35%)]" />

      {/* Centred landing content */}
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {companyName && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-oc-accent-2">
            {companyName}
          </p>
        )}

        <h1 className="text-3xl font-semibold tracking-tight text-oc-text sm:text-4xl">
          {welcomeTitle}
        </h1>

        <p className="mt-4 max-w-sm text-sm leading-7 text-oc-muted sm:text-base">
          {welcomeSubtitle}
        </p>

        <p className="mt-10 rounded-full border border-oc-border bg-oc-panel/60 px-4 py-2 text-xs text-oc-faint">
          Click the chat button in the bottom-right corner to get started.
        </p>
      </div>

      {/* Footer note */}
      {footerNote && (
        <footer className="w-full border-t border-oc-border px-4 py-4 text-center text-xs text-oc-faint">
          {footerNote}
        </footer>
      )}

      {/* Live chat widget — pre-bootstrapped so no second HTTP call */}
      <WidgetClient
        publicKey={publicKey}
        preBootstrapped
        widgetConfig={{
          companyDisplayName: companyName,
          chatGreeting,
          launcherLabel,
          messageShortcuts,
        }}
      />
    </main>
  );
}

function WidgetLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-oc-bg">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-oc-border border-t-oc-accent-2" />
    </div>
  );
}

function WidgetUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-oc-bg px-4 text-center">
      <div className="mx-auto max-w-sm space-y-3">
        <p className="text-base font-semibold text-oc-text">
          Support unavailable
        </p>
        <p className="text-sm leading-6 text-oc-muted">
          This support channel is not currently available. Please try again
          later or contact us through another channel.
        </p>
      </div>
    </main>
  );
}
