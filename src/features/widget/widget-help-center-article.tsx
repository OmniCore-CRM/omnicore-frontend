"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getErrorMessage,
} from "@/api/errors";
import {
  getPublicHelpCenterArticle,
  type PublicHelpCenterArticleResponse,
} from "@/api/widget";
import { WidgetClient } from "./widget-client";

type WidgetHelpCenterArticleProps = {
  publicKey: string;
  slug: string;
};

type ViewState = "loading" | "ready" | "invalid";

export function WidgetHelpCenterArticle({
  publicKey,
  slug,
}: WidgetHelpCenterArticleProps) {
  const [state, setState] = useState<ViewState>(publicKey ? "loading" : "invalid");
  const [data, setData] = useState<PublicHelpCenterArticleResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;

    let cancelled = false;

    getPublicHelpCenterArticle(publicKey, slug)
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setErrorMessage(null);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setData(null);
        setErrorMessage(getErrorMessage(error, "Article unavailable"));
        setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey, slug]);

  if (!publicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-oc-border bg-oc-panel/70 p-6 text-center shadow-oc-card">
          <h1 className="text-lg font-semibold">Article unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            This article is unavailable or no longer published.
          </p>
          <p className="mt-3 text-xs text-oc-faint">Missing widget key</p>
          <Link
            href="/widget/help"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            Back to Help Centre
          </Link>
        </div>
      </main>
    );
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="text-sm text-oc-muted">Loading article...</div>
      </main>
    );
  }

  if (state === "invalid" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-oc-border bg-oc-panel/70 p-6 text-center shadow-oc-card">
          <h1 className="text-lg font-semibold">Article unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            This article is unavailable or no longer published.
          </p>
          {errorMessage ? <p className="mt-3 text-xs text-oc-faint">{errorMessage}</p> : null}
          <Link
            href={`/widget/help?key=${encodeURIComponent(publicKey)}`}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            Back to Help Centre
          </Link>
        </div>
      </main>
    );
  }

  const article = data.article;

  return (
    <main className="min-h-screen overflow-x-hidden bg-oc-bg text-oc-text">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-28">
        <Link
          href={`/widget/help?key=${encodeURIComponent(publicKey)}`}
          className="inline-flex items-center text-xs font-medium text-oc-muted transition hover:text-oc-text"
        >
          Back to Help Centre
        </Link>

        <article className="mt-4 rounded-2xl border border-oc-border bg-oc-panel/60 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs text-oc-muted">
            {article.category?.name ? (
              <span className="rounded-full border border-oc-border bg-oc-bg-mid px-2.5 py-1">
                {article.category.name}
              </span>
            ) : (
              <span className="rounded-full border border-oc-border bg-oc-bg-mid px-2.5 py-1">General</span>
            )}
            {article.publishedAt ? (
              <span>
                Published {new Date(article.publishedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{article.title}</h1>
          <p className="mt-3 text-sm leading-7 text-oc-muted sm:text-base">{article.summary}</p>

          <div className="mt-6 rounded-xl border border-oc-border bg-oc-bg-mid/70 p-4 sm:p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-oc-text sm:text-[15px]">
              {article.content}
            </p>
          </div>
        </article>
      </div>

      <WidgetClient
        publicKey={publicKey}
        preBootstrapped
        defaultOpen={false}
        widgetConfig={{
          companyDisplayName: data.companyDisplayName,
          chatGreeting: data.chatGreeting ?? undefined,
          launcherLabel: data.launcherLabel ?? undefined,
          messageShortcuts: data.messageShortcuts,
        }}
      />
    </main>
  );
}
