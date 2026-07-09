"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  bootstrapWidget,
  createWidgetConversation,
  listWidgetMessages,
  sendWidgetMessage,
} from "@/api/widget";
import {
  downloadWidgetAttachment,
  uploadWidgetAttachment,
} from "@/api/attachments";
import { getErrorMessage } from "@/api/errors";
import { getSocketUrl } from "@/lib/env";
import type { Attachment, Message } from "@/types/models";
import {
  formatFileSize,
  InlineAttachmentItem,
} from "@/features/attachments/attachment-list";
import { buildConversationTimeline } from "@/features/attachments/conversation-timeline";
import { Loader2, Paperclip } from "lucide-react";

type StoredWidgetSession = {
  sessionToken: string;
  conversationId: string;
  visitorName: string;
  visitorEmail?: string;
};

type WidgetConfig = {
  companyDisplayName?: string | null;
  chatGreeting?: string;
  launcherLabel?: string;
  messageShortcuts?: string[];
};

type WidgetClientProps = {
  publicKey: string;
  /** When true, skip own bootstrap call (parent already bootstrapped). */
  preBootstrapped?: boolean;
  /** Branding/copy overrides from the bootstrap config. */
  widgetConfig?: WidgetConfig;
};

const socketEvents = {
  joinConversation: "join_conversation",
  newMessage: "new_message",
  statusUpdated: "message_status_updated",
  attachmentCreated: "attachment_created",
};

const defaultMessageShortcuts = [
  "I need help",
  "I want to make a complaint",
  "I have a billing issue",
  "I want to speak to support",
];

function storageKey(publicKey: string) {
  return `omnicore-widget:${publicKey}`;
}

function upsertMessage(messages: Message[], incoming: Message) {
  const existingIndex = messages.findIndex((m) => m.id === incoming.id);
  if (existingIndex >= 0) {
    const next = [...messages];
    next[existingIndex] = incoming;
    return next;
  }
  return [...messages, incoming].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function WidgetClient({
  publicKey,
  preBootstrapped = false,
  widgetConfig,
}: WidgetClientProps) {
  const [open, setOpen] = useState(true);
  // When pre-bootstrapped by the parent, start already bootstrapped so the
  // chat UI is immediately available without a second network call.
  const [bootstrapped, setBootstrapped] = useState(() => preBootstrapped);
  const [session, setSession] = useState<StoredWidgetSession | null>(() => {
    if (!preBootstrapped || !publicKey) return null;
    try {
      const stored = localStorage.getItem(storageKey(publicKey));
      return stored ? (JSON.parse(stored) as StoredWidgetSession) : null;
    } catch {
      localStorage.removeItem(storageKey(publicKey));
      return null;
    }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [composer, setComposer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    conversationId: string;
    file: File;
  } | null>(null);
  const pendingAttachmentFile =
    pendingAttachment &&
    pendingAttachment.conversationId === session?.conversationId
      ? pendingAttachment.file
      : null;
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const [connected, setConnected] = useState(false);

  // Resolved config values — fall back to built-in defaults
  const headerTitle =
    widgetConfig?.companyDisplayName?.trim() || "OmniCore Chat";
  const chatGreeting = widgetConfig?.chatGreeting?.trim() || "Hi there";
  const launcherLabel = widgetConfig?.launcherLabel?.trim() || "Chat";
  const shortcuts =
    widgetConfig?.messageShortcuts && widgetConfig.messageShortcuts.length > 0
      ? widgetConfig.messageShortcuts
      : defaultMessageShortcuts;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const tempMessageCounter = useRef(0);

  const canChat = Boolean(publicKey && bootstrapped);

  useEffect(() => {
    // Skip bootstrap when parent already validated the widget key.
    if (preBootstrapped) return;

    let cancelled = false;

    async function bootstrap() {
      if (!publicKey) {
        setError("Missing widget key");
        return;
      }

      try {
        await bootstrapWidget(publicKey);
        if (cancelled) return;

        setBootstrapped(true);
        const stored = localStorage.getItem(storageKey(publicKey));
        if (stored) {
          setSession(JSON.parse(stored) as StoredWidgetSession);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Widget is not available"));
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [publicKey, preBootstrapped]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    const activeSession = session;

    async function loadMessages() {
      try {
        const page = await listWidgetMessages(
          publicKey,
          activeSession.conversationId,
          activeSession.sessionToken,
        );
        if (!cancelled) {
          setMessages(page.items);
          setAttachments(page.attachments ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          localStorage.removeItem(storageKey(publicKey));
          setSession(null);
          setMessages([]);
          setAttachments([]);
          setError(getErrorMessage(err, "Please start a new chat"));
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [publicKey, session]);

  useEffect(() => {
    if (!session) return;
    const activeSession = session;

    const socket: Socket = io(getSocketUrl(), {
      auth: {
        token: activeSession.sessionToken,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(
        socketEvents.joinConversation,
        activeSession.conversationId,
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on(socketEvents.newMessage, (message: Message) => {
      if (message.conversationId === activeSession.conversationId) {
        setMessages((current) => upsertMessage(current, message));
      }
    });

    socket.on(socketEvents.statusUpdated, (message: Message) => {
      if (message.conversationId === activeSession.conversationId) {
        setMessages((current) => upsertMessage(current, message));
      }
    });

    socket.on(socketEvents.attachmentCreated, (attachment: Attachment) => {
      if (attachment.conversationId === activeSession.conversationId) {
        setAttachments((current) =>
          current.some((item) => item.id === attachment.id)
            ? current
            : [...current, attachment],
        );
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [attachments.length, messages.length]);

  const timeline = useMemo(
    () => buildConversationTimeline(messages, attachments),
    [attachments, messages],
  );

  const showComposerShortcuts = messages.length <= 1;

  async function startChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    try {
      const result = await createWidgetConversation({
        publicKey,
        visitorName,
        visitorEmail: visitorEmail || undefined,
        initialMessage,
      });

      const nextSession = {
        sessionToken: result.sessionToken,
        conversationId: result.conversation.id,
        visitorName,
        visitorEmail: visitorEmail || undefined,
      };

      localStorage.setItem(
        storageKey(publicKey),
        JSON.stringify(nextSession),
      );
      setSession(nextSession);
      setMessages(result.messages?.length ? result.messages : [result.message]);
      setInitialMessage("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not start chat"));
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) return;

    const content = composer.trim();
    const file = pendingAttachmentFile;
    if (!content && !file) return;

    const tempMessage: Message | null = content
      ? {
          id: `temp-${session.conversationId}-${++tempMessageCounter.current}`,
          conversationId: session.conversationId,
          content,
          sender: "CUSTOMER",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        }
      : null;

    if (content) setComposer("");
    if (tempMessage) {
      setMessages((current) => [...current, tempMessage]);
    }
    setSending(true);
    setError(null);

    try {
      if (content && tempMessage) {
        const message = await sendWidgetMessage(
          publicKey,
          session.conversationId,
          session.sessionToken,
          content,
        );
        setMessages((current) =>
          upsertMessage(
            current.filter((m) => m.id !== tempMessage.id),
            message,
          ),
        );
      }

      if (file) {
        const uploaded = await uploadAttachment(file);
        if (uploaded) {
          setPendingAttachment((current) =>
            current?.file === file ? null : current,
          );
        }
      }
    } catch (err) {
      if (tempMessage) {
        setMessages((current) =>
          current.map((m) =>
            m.id === tempMessage.id ? { ...m, status: "FAILED" } : m,
          ),
        );
      }
      setError(getErrorMessage(err, "Message failed to send"));
    } finally {
      setSending(false);
    }
  }

  async function uploadAttachment(file: File) {
    if (!session) return false;
    setUploading(true);
    setError(null);
    try {
      const attachment = await uploadWidgetAttachment(
        publicKey,
        session.conversationId,
        session.sessionToken,
        file,
      );
      setAttachments((current) =>
        current.some((item) => item.id === attachment.id)
          ? current
          : [...current, attachment],
      );
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Attachment failed to upload"));
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleAttachmentDownload(attachment: Attachment) {
    if (!session) return;
    setDownloadingAttachmentId(attachment.id);
    try {
      await downloadWidgetAttachment(
        publicKey,
        session.sessionToken,
        attachment,
      );
    } catch (err) {
      setError(getErrorMessage(err, "Attachment failed to download"));
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 min-h-12 min-w-20 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 ring-1 ring-white/20 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
      >
        {launcherLabel}
      </button>
    );
  }

  return (
    <div className="fixed right-3 bottom-3 left-3 mx-auto flex h-[min(640px,calc(100vh-1.5rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/25 sm:right-5 sm:left-auto sm:mx-0">
      <header className="flex shrink-0 items-center justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">
            {headerTitle}
          </h1>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-300"
              }`}
            />
            <span>
              {connected ? "Live support" : session ? "Connecting" : "Start a chat"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-9 shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
        >
          Close
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col bg-white">
        {error && (
          <div className="shrink-0 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!canChat && !error && (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-600">
            Loading chat...
          </div>
        )}

        {canChat && !session && (
          <form
            onSubmit={startChat}
            className="flex flex-1 flex-col overflow-y-auto gap-4 p-5"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {chatGreeting}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Send a message and the team will reply here.
              </p>
            </div>
            <input
              value={visitorName}
              onChange={(event) => setVisitorName(event.target.value)}
              placeholder="Your name"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              required
            />
            <input
              type="email"
              value={visitorEmail}
              onChange={(event) => setVisitorEmail(event.target.value)}
              placeholder="Email (optional)"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">
                Common requests
              </p>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut}
                    type="button"
                    onClick={() => setInitialMessage(shortcut)}
                    className="min-h-9 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                  >
                    {shortcut}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              placeholder="How can we help?"
              className="min-h-32 w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="min-h-11 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Starting..." : "Start chat"}
            </button>
          </form>
        )}

        {canChat && session && (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5">
              {timeline.map((item) => {
                if (item.type === "attachment") {
                  return (
                    <InlineAttachmentItem
                      key={`attachment-${item.id}`}
                      attachment={item.attachment}
                      downloadingId={downloadingAttachmentId}
                      onDownload={handleAttachmentDownload}
                      align={
                        item.attachment.uploadedFrom === "CUSTOMER_WIDGET"
                          ? "right"
                          : "left"
                      }
                      light
                    />
                  );
                }

                const mine = item.message.sender === "CUSTOMER";
                return (
                  <div
                    key={`message-${item.id}`}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-slate-950 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-950"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {item.message.content}
                      </p>
                      <div
                        className={`mt-2 flex items-center gap-2 text-[11px] ${
                          mine ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        <span>{formatMessageTime(item.message.createdAt)}</span>
                        {item.message.status === "PENDING" && <span>Sending</span>}
                        {item.message.status === "FAILED" && (
                          <span
                            className={mine ? "text-red-200" : "text-red-600"}
                          >
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {showComposerShortcuts && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3">
                <div className="flex flex-wrap gap-2">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      onClick={() => setComposer(shortcut)}
                      className="min-h-9 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                    >
                      {shortcut}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={sendMessage}
              className="flex shrink-0 flex-wrap items-end gap-3 border-t border-slate-200 bg-white p-4"
            >
              {pendingAttachmentFile && (
                <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <Paperclip className="h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {pendingAttachmentFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(pendingAttachmentFile.size)} selected. Send to upload.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    disabled={uploading}
                    className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-slate-700 transition hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-500">
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Upload attachment</span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && session) {
                      setPendingAttachment({
                        conversationId: session.conversationId,
                        file,
                      });
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                placeholder="Type a message"
                rows={1}
                className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
              <button
                type="submit"
                disabled={sending || uploading || (!composer.trim() && !pendingAttachmentFile)}
                className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending || uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
