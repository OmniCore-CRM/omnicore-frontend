import type { MetadataRoute } from "next";
import {
  fetchSupportSitemapData,
  supportPath,
  toAbsoluteUrl,
} from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchSupportSitemapData();

  const urls: MetadataRoute.Sitemap = [];

  for (const portal of data.portals) {
    const rootPath = supportPath(portal.companySlug);
    const helpPath = supportPath(portal.companySlug, "/help");
    const contactPath = supportPath(portal.companySlug, "/contact");

    urls.push(
      {
        url: toAbsoluteUrl(rootPath),
        lastModified: portal.updatedAt,
      },
      {
        url: toAbsoluteUrl(helpPath),
        lastModified: portal.updatedAt,
      },
      {
        url: toAbsoluteUrl(contactPath),
        lastModified: portal.updatedAt,
      },
    );

    for (const article of portal.articles) {
      urls.push({
        url: toAbsoluteUrl(
          supportPath(portal.companySlug, `/help/${article.slug}`),
        ),
        lastModified: article.updatedAt || article.publishedAt || portal.updatedAt,
      });
    }
  }

  return urls;
}
