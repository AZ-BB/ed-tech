import type { MetadataRoute } from "next";
import { buildPublicSitemap } from "@/lib/seo/public-sitemap";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await buildPublicSitemap();
  const lastModified = new Date();

  return pages.map(({ url, lastModified: pageLastModified }) => ({
    url,
    lastModified: pageLastModified ?? lastModified,
    changeFrequency: "monthly",
    priority: 1,
  }));
}
