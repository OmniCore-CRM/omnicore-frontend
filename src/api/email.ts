import { apiFetch } from "./client";
import type { EmailAccount, EmailAccountStatus } from "@/types/models";

export interface EmailAccountInput {
  provider?: "RESEND";
  fromEmail: string;
  fromName?: string;
  status?: EmailAccountStatus;
}

export async function listEmailAccounts(token: string): Promise<EmailAccount[]> {
  return apiFetch<EmailAccount[]>("/channels/email/accounts", { token });
}

export async function createEmailAccount(
  token: string,
  body: EmailAccountInput,
): Promise<EmailAccount> {
  return apiFetch<EmailAccount>("/channels/email/accounts", {
    method: "POST",
    token,
    body,
  });
}

export async function updateEmailAccount(
  token: string,
  accountId: string,
  body: Partial<EmailAccountInput>,
): Promise<EmailAccount> {
  return apiFetch<EmailAccount>(`/channels/email/accounts/${accountId}`, {
    method: "PATCH",
    token,
    body,
  });
}

export async function deleteEmailAccount(
  token: string,
  accountId: string,
): Promise<EmailAccount> {
  return apiFetch<EmailAccount>(`/channels/email/accounts/${accountId}`, {
    method: "DELETE",
    token,
  });
}
