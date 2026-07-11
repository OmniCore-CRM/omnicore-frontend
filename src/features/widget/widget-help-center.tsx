"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
  getErrorMessage,
} from "@/api/errors";
import {
  brandingImageUrl,
  askPublicHelpCenterQuestion,
  getPublicHelpCenter,
  type PublicHelpCenterAnswerResponse,
  type PublicHelpCenterResponse,
} from "@/api/widget";
import { WidgetClient } from "./widget-client";

type WidgetHelpCenterProps = {
  publicKey: string;
  initialCategory?: string;
  initialSearch?: string;
};

type ViewState = "loading" | "ready" | "invalid";
type AskState = "idle" | "loading" | "ready" | "error";

export function WidgetHelpCenter({
  publicKey,
  initialCategory = "",
  initialSearch = "",
}: WidgetHelpCenterProps) {
  const [category, setCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [data, setData] = useState<PublicHelpCenterResponse | null>(null);
  const [state, setState] = useState<ViewState>(publicKey ? "loading" : "invalid");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [askState, setAskState] = useState<AskState>("idle");
  const [askError, setAskError] = useState<string | null>(null);
  const [askResult, setAskResult] =
    useState<PublicHelpCenterAnswerResponse | null>(null);

  const search = useDebouncedValue(searchInput, 250);

  const askQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = questionInput.trim();
    if (!question) return;

    setAskState("loading");
    setAskError(null);

    try {
      const response = await askPublicHelpCenterQuestion(publicKey, question);
      setAskResult(response);
      setAskState("ready");
    } catch (error: unknown) {
      setAskResult(null);
      setAskError(getErrorMessage(error, "Could not find an answer right now"));
      setAskState("error");
    }
  };

  useEffect(() => {
    if (!publicKey) return;

    let cancelled = false;

    getPublicHelpCenter(publicKey, {
      category,
      search,
    })
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setErrorMessage(null);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = getErrorMessage(error, "Help Centre is unavailable");
        setData(null);
        setErrorMessage(message);
        setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey, category, search]);

  if (!publicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-oc-border bg-oc-panel/70 p-6 text-center shadow-oc-card">
          <h1 className="text-lg font-semibold">Invalid or unavailable widget key</h1>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            We could not open this Help Centre. Please verify the widget key or contact support.
          </p>
          <p className="mt-3 text-xs text-oc-faint">Missing widget key</p>
          <Link
            href="/widget"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            Back to widget landing
          </Link>
        </div>
      </main>
    );
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="text-sm text-oc-muted">Loading help centre...</div>
      </main>
    );
  }

  if (state === "invalid" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oc-bg px-4 text-oc-text">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-oc-border bg-oc-panel/70 p-6 text-center shadow-oc-card">
          <h1 className="text-lg font-semibold">Invalid or unavailable widget key</h1>
          <p className="mt-2 text-sm leading-6 text-oc-muted">
            We could not open this Help Centre. Please verify the widget key or contact support.
          </p>
          {errorMessage ? (
            <p className="mt-3 text-xs text-oc-faint">{errorMessage}</p>
          ) : null}
          <Link
            href="/widget"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-oc-border bg-oc-bg-mid px-4 py-2 text-xs font-semibold text-oc-text transition hover:bg-oc-panel"
          >
            Back to widget landing
          </Link>
        </div>
      </main>
    );
  }

  const logoSrc = brandingImageUrl(data.logoUrl);
  const heroSrc = brandingImageUrl(data.heroImageUrl);
  const brandColor = data.brandColor ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-oc-bg text-oc-text" style={brandColor ? ({ "--brand-color": brandColor } as React.CSSProperties) : undefined}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={`/widget?key=${encodeURIComponent(publicKey)}`}
          className="inline-flex items-center text-xs font-medium text-oc-muted transition hover:text-oc-text"
        >
          Back to landing
        </Link>

        <section className="mt-4 overflow-hidden rounded-2xl border border-oc-border bg-oc-panel/70 shadow-oc-card">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroSrc}
              alt=""
              className="h-36 w-full object-cover sm:h-44"
            />
          ) : null}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt={data.companyDisplayName?.trim() || "Company logo"}
                  className="h-10 max-w-[160px] object-contain"
                />
              ) : null}
              {data.companyDisplayName?.trim() ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oc-muted">
                  {data.companyDisplayName}
                </p>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {data.welcomeTitle?.trim() || "Help Centre"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-oc-muted sm:text-base">
              {data.welcomeSubtitle?.trim() || "Find quick answers from published support articles."}
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-oc-border bg-oc-panel/50 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Search</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search articles"
                className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
              />
            </label>

            <label className="block md:min-w-[220px]">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
              >
                <option value="">All categories</option>
                {data.categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-oc-border bg-oc-panel/50 p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">Ask a Question</h2>
              <p className="mt-1 text-sm text-oc-muted">
                Ask in plain language and we will find the closest published answer.
              </p>
            </div>

            <form onSubmit={askQuestion} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Your question</span>
                <input
                  type="text"
                  value={questionInput}
                  onChange={(event) => setQuestionInput(event.target.value)}
                  placeholder="e.g. How do I reset my password?"
                  className="h-11 w-full rounded-xl border border-oc-border bg-oc-bg-mid px-3 text-sm text-oc-text outline-none transition focus:border-oc-accent"
                  maxLength={300}
                />
              </label>

              <button
                type="submit"
                disabled={askState === "loading" || !questionInput.trim()}
                className="h-11 rounded-xl border border-oc-border bg-oc-bg-mid px-4 text-sm font-semibold text-oc-text transition hover:bg-oc-panel disabled:cursor-not-allowed disabled:opacity-60"
              >
                {askState === "loading" ? "Finding answer..." : "Find Answer"}
              </button>
            </form>

            {askState === "error" && askError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {askError}
              </div>
            ) : null}

            {askState === "ready" && askResult ? (
              <div className="space-y-3">
                {askResult.state === "ANSWERED" && askResult.answer ? (
                  <div className="rounded-xl border border-oc-border bg-oc-panel/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Best match</p>
                    <h3 className="mt-1 text-base font-semibold break-words">
                      {askResult.answer.article.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-oc-muted break-words">
                      {askResult.answer.excerpt}
                    </p>
                    <Link
                      href={`/widget/help/${encodeURIComponent(askResult.answer.article.slug)}?key=${encodeURIComponent(publicKey)}`}
                      className="mt-3 inline-flex items-center text-sm font-medium text-oc-accent-2 transition hover:text-oc-text"
                    >
                      Read full answer
                    </Link>

                    {askResult.suggestions.length > 0 ? (
                      <div className="mt-4 space-y-2 border-t border-oc-border pt-3">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-oc-muted">Related answers</p>
                        <div className="space-y-2">
                          {askResult.suggestions.map((item) => (
                            <Link
                              key={item.article.id}
                              href={`/widget/help/${encodeURIComponent(item.article.slug)}?key=${encodeURIComponent(publicKey)}`}
                              className="block rounded-lg border border-oc-border bg-oc-bg-mid p-3 transition hover:bg-oc-panel"
                            >
                              <p className="text-sm font-medium break-words">{item.article.title}</p>
                              <p className="mt-1 text-xs leading-6 text-oc-muted break-words">{item.excerpt}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {askResult.state === "NO_MATCH" ? (
                  <div className="rounded-xl border border-oc-border bg-oc-panel/60 p-4 text-sm text-oc-muted">
                    <p className="font-medium text-oc-text">No direct answer found</p>
                    <p className="mt-1">Try a shorter question, different keywords, or browse the articles below.</p>
                  </div>
                ) : null}

                {askResult.state === "EMPTY" ? (
                  <div className="rounded-xl border border-oc-border bg-oc-panel/60 p-4 text-sm text-oc-muted">
                    <p className="font-medium text-oc-text">No published answers yet</p>
                    <p className="mt-1">This Help Centre is currently empty. Please check back later for updates.</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 space-y-3 pb-20">
          {data.articles.length === 0 ? (
            <div className="rounded-2xl border border-oc-border bg-oc-panel/50 p-6 text-center">
              <h2 className="text-base font-semibold">No published articles found</h2>
              <p className="mt-2 text-sm text-oc-muted">
                Try a different category or search term, or check back later for new updates.
              </p>
            </div>
          ) : (
            data.articles.map((article) => (
              <article key={article.id} className="rounded-2xl border border-oc-border bg-oc-panel/60 p-4 sm:p-5">
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

                <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                  <Link
                    href={`/widget/help/${encodeURIComponent(article.slug)}?key=${encodeURIComponent(publicKey)}`}
                    className="transition hover:text-oc-accent-2"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-7 text-oc-muted">{article.summary}</p>

                <Link
                  href={`/widget/help/${encodeURIComponent(article.slug)}?key=${encodeURIComponent(publicKey)}`}
                  className="mt-4 inline-flex items-center text-sm font-medium text-oc-accent-2 transition hover:text-oc-text"
                >
                  Read article
                </Link>
              </article>
            ))
          )}
        </section>
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
