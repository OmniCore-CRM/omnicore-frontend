import { apiDownload, apiFetch } from "./client";
import type { Attachment } from "@/types/models";

async function upload(
  path: string,
  file: File,
  options: {
    token?: string;
    fields?: Record<string, string>;
  } = {},
) {
  const form = new FormData();
  form.set("file", file);
  Object.entries(options.fields ?? {}).forEach(([key, value]) => {
    form.set(key, value);
  });

  return apiFetch<Attachment>(path, {
    method: "POST",
    token: options.token,
    rawBody: form,
  });
}

export const uploadConversationAttachment = (
  token: string,
  conversationId: string,
  file: File,
) =>
  upload("/attachments/upload", file, {
    token,
    fields: { conversationId },
  });

export const uploadTicketAttachment = (
  token: string,
  ticketId: string,
  file: File,
) => upload(`/tickets/${ticketId}/attachments`, file, { token });

export const uploadWidgetAttachment = (
  publicKey: string,
  conversationId: string,
  sessionToken: string,
  file: File,
) =>
  upload(`/widget/conversations/${conversationId}/attachments`, file, {
    fields: { publicKey, sessionToken },
  });

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadAttachment(
  token: string,
  attachment: Attachment,
) {
  const blob = await apiDownload(attachment.downloadUrl, { token });
  saveBlob(blob, attachment.fileName);
}

export async function downloadWidgetAttachment(
  publicKey: string,
  sessionToken: string,
  attachment: Attachment,
) {
  const blob = await apiDownload(attachment.downloadUrl, {
    headers: {
      "x-widget-key": publicKey,
      "x-widget-session": sessionToken,
    },
  });
  saveBlob(blob, attachment.fileName);
}
