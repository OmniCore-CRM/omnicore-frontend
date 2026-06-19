import { WidgetClient } from "@/features/widget/widget-client";

function buildIframeSnippet(publicKey: string) {
  const key = publicKey || "YOUR_WIDGET_PUBLIC_KEY";

  return `<iframe
  src="https://your-omnicore-domain.com/widget?key=${key}"
  style="position:fixed;right:16px;bottom:16px;width:380px;height:620px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);border:0;z-index:2147483647;"
  title="OmniCore Chat"
></iframe>`;
}

function buildMobileWebViewUrl(publicKey: string) {
  const key = publicKey || "YOUR_WIDGET_PUBLIC_KEY";
  return `https://your-omnicore-domain.com/widget?key=${key}`;
}

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  const publicKey = params.key ?? "";
  const displayKey = publicKey || "No widget key provided";

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-oc-bg text-oc-text">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(52,211,153,0.12),transparent_28%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl min-w-0 flex-col gap-8 overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-oc-accent-2">
              OmniCore Website Chat Widget
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-oc-text sm:text-4xl">
              Test a customer-facing chat experience before installing it on a website.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-oc-muted sm:text-base">
              This preview page shows how the lightweight website widget can sit
              on top of a company site. Click the chat button to test the widget.
              Messages sent here appear in OmniCore Inbox.
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-oc-border bg-oc-panel/70 p-4 shadow-oc-card">
            <p className="text-xs font-semibold uppercase text-oc-faint">
              Current public key
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-oc-border bg-oc-bg px-3 py-3 font-mono text-xs text-oc-accent-2">
              <span className="block truncate" title={displayKey}>
                {displayKey}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-oc-muted">
              Public widget keys are safe to embed. Never include private API
              tokens, provider credentials, or company secrets in widget code.
            </p>
          </div>
        </header>

        <section className="grid min-w-0 gap-4 md:grid-cols-3">
          {[
            ["Customer", "A visitor opens the widget from your website or mobile WebView."],
            ["Widget", "The visitor starts or resumes a lightweight support conversation."],
            ["OmniCore Inbox", "Agents receive the message and reply from the existing inbox workflow."],
          ].map(([title, body]) => (
            <article
              key={title}
              className="min-w-0 rounded-xl border border-oc-border bg-oc-panel/65 p-5 shadow-oc-card"
            >
              <p className="text-sm font-semibold text-oc-text">{title}</p>
              <p className="mt-2 text-sm leading-6 text-oc-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="grid min-h-0 min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-oc-border bg-oc-panel/70 p-5 shadow-oc-card">
              <h2 className="text-base font-semibold text-oc-text">
                Integration options
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-oc-text">
                    Website iframe/embed
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-oc-muted">
                    Use the iframe snippet for staging and simple website
                    installs. Keep allowed domains configured in OmniCore
                    Settings.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-oc-text">
                    Mobile app WebView MVP
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-oc-muted">
                    For an MVP mobile app, load the widget URL in a WebView and
                    pass the same public widget key.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-oc-text">
                    Future native SDK/API
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-oc-muted">
                    Production mobile apps should eventually use tenant-safe
                    public conversation APIs or a dedicated SDK instead of a
                    WebView-only integration.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-oc-border bg-oc-panel/70 p-5 shadow-oc-card">
              <h2 className="text-base font-semibold text-oc-text">
                Example embed snippet
              </h2>
              <pre className="mt-4 max-h-72 max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-oc-border bg-oc-bg p-4 text-xs leading-5 text-oc-muted">
                <code className="block min-w-0 max-w-full">{buildIframeSnippet(publicKey)}</code>
              </pre>
              <p className="mt-3 text-xs leading-5 text-oc-faint">
                Replace the demo domain with your deployed OmniCore frontend
                URL. The key shown here comes from the current page query.
              </p>
            </div>

            <div className="rounded-xl border border-oc-border bg-oc-panel/70 p-5 shadow-oc-card">
              <h2 className="text-base font-semibold text-oc-text">
                Mobile WebView URL
              </h2>
              <div className="mt-4 max-w-full overflow-x-auto rounded-lg border border-oc-border bg-oc-bg px-3 py-3 font-mono text-xs text-oc-muted">
                <span className="block min-w-0 break-all" title={buildMobileWebViewUrl(publicKey)}>
                  {buildMobileWebViewUrl(publicKey)}
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-oc-border bg-oc-bg-mid/80 p-4 shadow-oc-card sm:p-5">
            <div className="overflow-hidden rounded-xl border border-oc-border bg-oc-panel">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-oc-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-oc-text">
                    Mock company website preview
                  </p>
                  <p className="text-xs text-oc-muted">
                    The widget floats over the page just like it would on a real site.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-950/30 px-3 py-1 text-xs font-medium text-emerald-200">
                  Live preview
                </span>
              </div>

              <div className="grid gap-4 p-4 sm:p-6">
                <div className="rounded-xl border border-oc-border bg-oc-bg/80 p-5">
                  <p className="text-xs font-semibold uppercase text-oc-faint">
                    Acme Support Portal
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-oc-text">
                    How can we help today?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-oc-muted">
                    Browse help topics, contact support, or start a conversation
                    with the team using the OmniCore chat button.
                  </p>
                </div>

                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  {[
                    ["Order status", "Track recent requests and service updates."],
                    ["Billing help", "Ask questions about invoices and payments."],
                    ["Technical support", "Report an issue and follow up in chat."],
                    ["Speak to an agent", "Start a realtime support conversation."],
                  ].map(([title, body]) => (
                    <div
                      key={title}
                      className="min-w-0 rounded-lg border border-oc-border bg-oc-bg/55 p-4"
                    >
                      <p className="text-sm font-semibold text-oc-text">
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-oc-muted">
                        {body}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-dashed border-oc-border bg-oc-bg/50 p-5 text-sm leading-6 text-oc-muted">
                  Click the chat button in the bottom-right corner to test the
                  live widget. Visitor messages will be routed to OmniCore Inbox
                  for the matching widget installation.
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <WidgetClient publicKey={publicKey} />
    </main>
  );
}
