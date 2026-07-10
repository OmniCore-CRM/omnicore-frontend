import { apiFetch } from "./client";
import { normalizePaginated } from "./normalize";
import type { Paginated } from "@/types/api";
import type {
  Message,
  Attachment,
  WidgetArticle,
  WidgetArticleCategory,
  WidgetFaqEntry,
  WidgetInstallation,
} from "@/types/models";
import { getApiBaseUrl } from "@/lib/env";

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
    brandColor?: string | null;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
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
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  brandColor?: string | null;
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

export async function listWidgetArticleCategories(
  token: string,
  installationId: string,
): Promise<WidgetArticleCategory[]> {
  return apiFetch<WidgetArticleCategory[]>(
    `/widget/installations/${installationId}/categories`,
    { token },
  );
}

export async function createWidgetArticleCategory(
  token: string,
  installationId: string,
  body: { name: string; slug: string; sortOrder?: number },
): Promise<WidgetArticleCategory> {
  return apiFetch<WidgetArticleCategory>(
    `/widget/installations/${installationId}/categories`,
    { method: "POST", token, body },
  );
}

export async function updateWidgetArticleCategory(
  token: string,
  installationId: string,
  categoryId: string,
  body: { name?: string; slug?: string; sortOrder?: number },
): Promise<WidgetArticleCategory> {
  return apiFetch<WidgetArticleCategory>(
    `/widget/installations/${installationId}/categories/${categoryId}`,
    { method: "PATCH", token, body },
  );
}

export async function deleteWidgetArticleCategory(
  token: string,
  installationId: string,
  categoryId: string,
): Promise<void> {
  await apiFetch(`/widget/installations/${installationId}/categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}

export async function listWidgetArticles(
  token: string,
  installationId: string,
): Promise<WidgetArticle[]> {
  return apiFetch<WidgetArticle[]>(
    `/widget/installations/${installationId}/articles`,
    { token },
  );
}

export async function getWidgetArticle(
  token: string,
  installationId: string,
  articleId: string,
): Promise<WidgetArticle> {
  return apiFetch<WidgetArticle>(
    `/widget/installations/${installationId}/articles/${articleId}`,
    { token },
  );
}

export async function createWidgetArticle(
  token: string,
  installationId: string,
  body: {
    title: string;
    slug: string;
    summary: string;
    content: string;
    categoryId?: string | null;
    sortOrder?: number;
  },
): Promise<WidgetArticle> {
  return apiFetch<WidgetArticle>(
    `/widget/installations/${installationId}/articles`,
    { method: "POST", token, body },
  );
}

export async function updateWidgetArticle(
  token: string,
  installationId: string,
  articleId: string,
  body: {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    categoryId?: string | null;
    sortOrder?: number;
  },
): Promise<WidgetArticle> {
  return apiFetch<WidgetArticle>(
    `/widget/installations/${installationId}/articles/${articleId}`,
    { method: "PATCH", token, body },
  );
}

export async function updateWidgetArticleStatus(
  token: string,
  installationId: string,
  articleId: string,
  status: "PUBLISHED" | "ARCHIVED",
): Promise<WidgetArticle> {
  return apiFetch<WidgetArticle>(
    `/widget/installations/${installationId}/articles/${articleId}/status`,
    { method: "PATCH", token, body: { status } },
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

export function brandingImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${getApiBaseUrl()}${path.replace("/api/v1", "")}`;
}

export async function uploadWidgetLogo(
  token: string,
  installationId: string,
  file: File,
): Promise<WidgetInstallation> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${getApiBaseUrl()}/widget/installations/${installationId}/logo`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? "Upload failed");
  }
  const body = await res.json() as { data: WidgetInstallation };
  return body.data;
}

export async function removeWidgetLogo(
  token: string,
  installationId: string,
): Promise<WidgetInstallation> {
  return apiFetch<WidgetInstallation>(
    `/widget/installations/${installationId}/logo`,
    { method: "DELETE", token },
  );
}

export async function uploadWidgetHero(
  token: string,
  installationId: string,
  file: File,
): Promise<WidgetInstallation> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${getApiBaseUrl()}/widget/installations/${installationId}/hero`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? "Upload failed");
  }
  const body = await res.json() as { data: WidgetInstallation };
  return body.data;
}

export async function removeWidgetHero(
  token: string,
  installationId: string,
): Promise<WidgetInstallation> {
  return apiFetch<WidgetInstallation>(
    `/widget/installations/${installationId}/hero`,
    { method: "DELETE", token },
  );
}
