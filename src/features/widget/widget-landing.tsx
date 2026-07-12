"use client";

import { useEffect, useState } from "react";
import {
  bootstrapSupportPortal,
  bootstrapWidget,
  brandingImageUrl,
} from "@/api/widget";
import { WidgetClient } from "./widget-client";
import { SupportPortalNav } from "./support-portal-nav";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

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
  publicKey?: string;
  companySlug?: string;
};

export function WidgetLanding({ publicKey = "", companySlug = "" }: WidgetLandingProps) {
  const slug = companySlug.trim().toLowerCase();
  const key = publicKey.trim();
  const isSlugMode = Boolean(slug);
  const identity = isSlugMode ? slug : key;
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    identity ? "loading" : "unavailable",
  );
  const [config, setConfig] = useState<BootstrapConfig | null>(null);

  useEffect(() => {
    if (!identity) return;

    let cancelled = false;

    const fetcher = isSlugMode
      ? bootstrapSupportPortal(slug)
      : bootstrapWidget(key);

    fetcher
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
  }, [identity, isSlugMode, key, slug]);

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
  const resolvedPublicKey = config.publicKey?.trim() || key;

  if (!resolvedPublicKey) {
    return <WidgetUnavailable />;
  }

  // Branding
  const logoSrc = brandingImageUrl(config.logoUrl);
  const heroSrc = brandingImageUrl(config.heroImageUrl);
  const brandColor = config.brandColor ?? null;
  // Inject brand color as CSS custom property for accent use
  const brandStyle = brandColor
    ? ({ "--brand-color": brandColor } as React.CSSProperties)
    : undefined;

  return (
    <main
      className="relative flex min-h-screen w-full flex-col bg-oc-bg text-oc-text"
      style={brandStyle}
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.15),transparent_40%),radial-gradient(circle_at_80%_5%,rgba(52,211,153,0.10),transparent_35%)]" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {isSlugMode ? (
          <div className="mb-4">
            <SupportPortalNav companySlug={slug} current="home" />
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-oc-border bg-oc-panel/70 shadow-oc-card">
          {heroSrc ? (
            <div className="px-4 pt-4 sm:px-6 sm:pt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroSrc}
                alt=""
                className="h-36 w-full rounded-xl object-cover sm:h-52"
              />
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt={companyName ?? "Company logo"}
                  className="h-10 max-w-[180px] object-contain sm:h-12"
                />
              ) : null}
              <div className="min-w-0">
                {companyName ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oc-muted">
                    {companyName}
                  </p>
                ) : null}
                <p
                  className="text-xs font-medium uppercase tracking-[0.16em] text-oc-faint"
                  style={brandColor ? { color: brandColor } : undefined}
                >
                  Support Portal
                </p>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-oc-text sm:text-3xl">
              {welcomeTitle}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-oc-muted sm:text-base">
              {welcomeSubtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <p className="rounded-full border border-oc-border bg-oc-panel/60 px-4 py-2 text-xs text-oc-faint">
                Click the chat button in the bottom-right corner to get started.
              </p>
              <Link
                href={
                  isSlugMode
                    ? `/support/${encodeURIComponent(slug)}/help`
                    : `/widget/help?key=${encodeURIComponent(resolvedPublicKey)}`
                }
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-oc-border bg-oc-panel/70 px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
              >
                Browse Help Centre
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* FAQ Accordion */}
      {config?.faqEntries && config.faqEntries.length > 0 && (
        <section className="w-full border-t border-oc-border bg-oc-panel/40 px-4 py-12">
          <div className="mx-auto max-w-xl space-y-4">
            <h2 className="text-lg font-semibold text-oc-text">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {config.faqEntries.map((entry) => (
                <FaqAccordionItem
                  key={entry.id}
                  question={entry.question}
                  answer={entry.answer}
                  brandColor={brandColor}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer note */}
      {footerNote && (
        <footer className="w-full border-t border-oc-border px-4 py-4 text-center text-xs text-oc-faint">
          {footerNote}
        </footer>
      )}

      {/* Live chat widget — pre-bootstrapped so no second HTTP call */}
      <WidgetClient
        publicKey={resolvedPublicKey}
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

function FaqAccordionItem({
  question,
  answer,
  brandColor,
}: {
  question: string;
  answer: string;
  brandColor?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-oc-border bg-oc-panel/80">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-oc-panel/100"
        style={isOpen && brandColor ? { color: brandColor } : undefined}
      >
        <span className="text-sm font-semibold text-oc-text">{question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          style={brandColor ? { color: brandColor } : { color: "var(--oc-muted)" }}
        />
      </button>
      {isOpen && (
        <div className="border-t border-oc-border bg-oc-bg/40 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-oc-muted">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
