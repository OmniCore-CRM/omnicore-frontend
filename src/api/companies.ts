import { apiFetch } from "./client";

export type CompanyPortalSettings = {
  companyId: string;
  companyName: string;
  companySlug: string | null;
  supportPortalEnabled: boolean;
  customSupportDomain: string | null;
  verificationStatus: "NOT_CONFIGURED" | "PENDING" | "VERIFIED" | "FAILED";
  verificationToken: string | null;
  verifiedAt: string | null;
  sslStatus: "NOT_CONFIGURED" | "PENDING" | "READY" | "FAILED";
  domainStatus: "NOT_CONFIGURED" | "PENDING" | "READY" | "FAILED";
  createdAt: string;
  updatedAt: string;
};

export async function getCompanyPortalSettings(
  token: string,
): Promise<CompanyPortalSettings> {
  return apiFetch<CompanyPortalSettings>("/companies/portal-settings", {
    token,
  });
}

export async function updateCompanyPortalSettings(
  token: string,
  body: {
    companySlug?: string | null;
    supportPortalEnabled?: boolean;
    customSupportDomain?: string | null;
  },
): Promise<CompanyPortalSettings> {
  return apiFetch<CompanyPortalSettings>("/companies/portal-settings", {
    method: "PATCH",
    token,
    body,
  });
}
