import { apiFetch } from "./client";

export type CompanyPortalSettings = {
  companyId: string;
  companyName: string;
  companySlug: string | null;
  supportPortalEnabled: boolean;
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
  },
): Promise<CompanyPortalSettings> {
  return apiFetch<CompanyPortalSettings>("/companies/portal-settings", {
    method: "PATCH",
    token,
    body,
  });
}
