import type { MetadataRoute } from "next";
import { getWebBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getWebBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/support/"],
        disallow: [
          "/api/",
          "/widget",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/inbox",
          "/conversations",
          "/customers",
          "/tickets",
          "/settings",
          "/teams",
          "/notifications",
          "/analytics",
          "/knowledge-base",
          "/assignment-center",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
