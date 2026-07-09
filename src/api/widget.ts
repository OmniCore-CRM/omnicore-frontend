import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type {
  Message,
  Attachment,
  WidgetFaqEntry,
  WidgetInstallation,
} from "@/types/models";

type PublicWidgetCustomer = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PublicWidgetConversation = {
  id: string;
  customerId: string;
  channel: "WEBSITE";
  customer: PublicWidgetCustomer;
  messages?: Message[];
  createdAt?: string;
  updatedAt?: string;
};

export async function listWidgetInstallations(
  token: string,
): Promise<WidgetInstallation[]> {
  return apiFetch<WidgetInstallation[]>("/widget/installations", {
    token,
  });
}

export async function createWidgetInstallation(
  token: string,
  body: {
    allowedDomains: string[];
  },
): Promise<WidgetInstallation> {
  return apiFetch<WidgetInstallation>("/widget/installations", {
    method: "POST",
    token,
    body,
  });
}

export async function updateWidgetInstallation(
  token: string,
  installationId: string,
  body: {
    enabled?: boolean;
    allowedDomains?: string[];
    companyDisplayName?: string;
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    chatGreeting?: string;
    launcherLabel?: string;
    footerNote?: string;
    messageShortcuts?: string[];
  },
): Promise<WidgetInstallation> {
  return apiFetch<WidgetInstallation>(
    `/widget/installations/${installationId}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export async function bootstrapWidget(
  publicKey: string,
): Promise<{
  publicKey: string;
  enabled: boolean;
  companyDisplayName?: string | null;
  welcomeTitle?: string | null;
  welcomeSubtitle?: string | null;
  chatGreeting?: string | null;
  launcherLabel?: string | null;
  footerNote?: string | null;
  messageShortcuts?: string[];
  faqEntries?: { id: string; question: string; answer: string; sortOrder: number }[];
}> {
  const q = new URLSearchParams({ key: publicKey });
  return apiFetch(`/widget/bootstrap?${q.toString()}`);
}

export async function listWidgetFaqEntries(
  token: string,
  installationId: string,
): Promise<WidgetFaqEntry[]> {
  return apiFetch<WidgetFaqEntry[]>(
    `/widget/installations/${installationId}/faq`,
    { token },
  );
}

export async function createWidgetFaqEntry(
  token: string,
  installationId: string,
  body: { question: string; answer: string; sortOrder?: number },
): Promise<WidgetFaqEntry> {
  return apiFetch<WidgetFaqEntry>(
    `/widget/installations/${installationId}/faq`,
    { method: "POST", token, body },
  );
}

export async function updateWidgetFaqEntry(
  token: string,
  installationId: string,
  faqId: string,
  body: { question?: string; answer?: string; sortOrder?: number },
): Promise<WidgetFaqEntry> {
  return apiFetch<WidgetFaqEntry>(
    `/widget/installations/${installationId}/faq/${faqId}`,
    { method: "PATCH", token, body },
  );
}

export async function deleteWidgetFaqEntry(
  token: string,
  installationId: string,
  faqId: string,
): Promise<void> {
  await apiFetch(
    `/widget/installations/${installationId}/faq/${faqId}`,
    { method: "DELETE", token },
  );
}

export async function createWidgetConversation(body: {
  publicKey: string;
  visitorName: string;
  visitorEmail?: string;
  initialMessage: string;
}): Promise<{
  sessionToken: string;
  customer: PublicWidgetCustomer;
  conversation: PublicWidgetConversation;
  message: Message;
  messages: Message[];
}> {
  return apiFetch("/widget/conversations", {
    method: "POST",
    body,
  });
}

export async function listWidgetMessages(
  publicKey: string,
  conversationId: string,
  sessionToken: string,
): Promise<Paginated<Message> & { attachments?: Attachment[] }> {
  const q = new URLSearchParams({
    key: publicKey,
    sessionToken,
  });
  const raw = await apiFetch<unknown>(
    `/widget/conversations/${conversationId}/messages?${q.toString()}`,
  );
  const page = normalizePaginated<Message>(raw);
  const attachments =
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { attachments?: unknown[] }).attachments)
      ? ((raw as { attachments: Attachment[] }).attachments)
      : undefined;
  return { ...page, attachments };
}

export async function sendWidgetMessage(
  publicKey: string,
  conversationId: string,
  sessionToken: string,
  content: string,
): Promise<Message> {
  return apiFetch<Message>(
    `/widget/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: {
        publicKey,
        sessionToken,
        content,
      },
    },
  );
}
