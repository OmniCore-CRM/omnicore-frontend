"use client";

import Link from "next/link";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/errors";
import {
  bootstrapSupportPortal,
  brandingImageUrl,
  submitSupportContact,
  type PublicSupportContactResponse,
} from "@/api/widget";
import { WidgetClient } from "./widget-client";
import { SupportPortalNav } from "./support-portal-nav";

type BootstrapConfig = Awaited<ReturnType<typeof bootstrapSupportPortal>>;

type ViewState = "loading" | "ready" | "invalid";

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

export function WidgetContactSupport({ companySlug = "" }: { companySlug?: string }) {
  const slug = companySlug.trim().toLowerCase();
  const [state, setState] = useState<ViewState>(slug ? "loading" : "invalid");
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<PublicSupportContactResponse | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    bootstrapSupportPortal(slug)
      .then((response) => {
        if (cancelled) return;
        setConfig(response);
        setErrorMessage(null);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setConfig(null);
        setErrorMessage(getErrorMessage(error, "Support portal is unavailable"));
        setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const resolvedPublicKey = config?.publicKey?.trim() || null;
  const companyName = config?.companyDisplayName?.trim() || null;
  const logoSrc = brandingImageUrl(config?.logoUrl);
  const heroSrc = brandingImageUrl(config?.heroImageUrl);
  const brandColor = config?.brandColor ?? null;
  const canSubmit =
    !submitting &&
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    form.message.trim().length > 0;

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slug || submitted) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject.trim(),
      message: form.message.trim(),
      website: form.website.trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitSupportContact(slug, payload);
      setSubmitted(response);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not submit your request right now"));
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="text-sm text-oc-muted">Loading contact form...</div>
      </main>
    );
  }

  if (state === "invalid" || !config || !resolvedPublicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-oc-border bg-oc-panel/70 p-6 text-center shadow-oc-card">
          <h1 className="text-lg font-semibold">Support portal unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            This support portal is unavailable right now. Please try again later.
          </p>
          {errorMessage ? <p className="mt-3 text-xs text-oc-faint">{errorMessage}</p> : null}
          <Link
            href="/"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-oc-bg text-oc-text"
      style={brandColor ? ({ "--brand-color": brandColor } as CSSProperties) : undefined}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <SupportPortalNav companySlug={slug} current="contact" />

        <section className="mt-4 overflow-hidden rounded-2xl border border-oc-border bg-oc-panel/70 shadow-oc-card">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt="" className="h-36 w-full object-cover sm:h-52" />
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
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-oc-faint">
                  Contact Support
                </p>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Contact Support
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-oc-muted sm:text-base">
              Send a support request and we will create a conversation for the team to reply to in the CRM inbox.
            </p>
          </div>
        </section>

        {submitted ? (
          <section className="mt-5 rounded-2xl border border-oc-border bg-oc-panel/60 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Thanks, we received your message.</h2>
            <p className="mt-2 text-sm leading-7 text-oc-muted">
              The team will reply from the existing inbox conversation as soon as possible.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/support/${encodeURIComponent(slug)}`}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
              >
                Home
              </Link>
              <Link
                href={`/support/${encodeURIComponent(slug)}/help`}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-oc-border bg-oc-panel/70 px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
              >
                Help Centre
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-oc-border bg-oc-panel/60 p-5 sm:p-6">
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                    maxLength={120}
                    className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                    placeholder="Your name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                    maxLength={255}
                    className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                    placeholder="you@company.com"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    maxLength={40}
                    className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                    placeholder="Optional"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Subject</span>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    required
                    maxLength={160}
                    className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                    placeholder="How can we help?"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Message</span>
                <textarea
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  required
                  maxLength={5000}
                  rows={7}
                  className="w-full rounded-2xl border border-oc-border bg-oc-bg-mid px-3 py-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                  placeholder="Tell us what happened and what you need help with"
                />
              </label>

              <input
                type="text"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {errorMessage ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-oc-border bg-oc-bg-mid px-5 py-2 text-sm font-semibold text-oc-text transition hover:bg-oc-panel disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send request"}
                </button>
                <Link
                  href={`/support/${encodeURIComponent(slug)}/help`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-oc-border bg-oc-panel/70 px-5 py-2 text-sm font-semibold text-oc-text transition hover:bg-oc-panel"
                >
                  Browse Help Centre
                </Link>
              </div>
            </form>
          </section>
        )}
      </div>

      <WidgetClient
        publicKey={resolvedPublicKey}
        preBootstrapped
        defaultOpen={false}
        widgetConfig={{
          companyDisplayName: companyName,
          chatGreeting: config.chatGreeting ?? undefined,
          launcherLabel: config.launcherLabel ?? undefined,
          messageShortcuts: config.messageShortcuts,
        }}
      />
    </main>
  );
}
