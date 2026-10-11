import { fetchPublicWebinarsPage } from "@/app/[locale]/webinars/_lib/fetch-public-webinars";
import { localizedPublicPaths, locales, type Locale } from "@/lib/i18n/config";
import { listActiveInfluencerFunnels } from "@/lib/influencer-funnels";
import { resolvePublicSiteOrigin } from "@/lib/resend/site-url";

export type PublicSitemapPage = {
  url: string;
  lastModified?: Date;
};

const SITEMAP_EXCLUDED_PATHS = new Set([
  "/login",
  "/signup",
  "/signup/individual",
  "/auth/reset-password",
]);

function isExcludedSitemapPath(path: string): boolean {
  if (SITEMAP_EXCLUDED_PATHS.has(path)) return true;
  return path.endsWith("/signup");
}

function localizedAbsoluteUrl(origin: string, locale: Locale, path: string): string {
  if (path === "/") return `${origin}/${locale}`;
  return `${origin}/${locale}${path}`;
}

function entriesForLocalizedPath(path: string, lastModified?: Date): PublicSitemapPage[] {
  const origin = resolvePublicSiteOrigin();
  return locales.map((locale) => ({
    url: localizedAbsoluteUrl(origin, locale, path),
    lastModified,
  }));
}

/** URLs for marketing and guest-accessible locale-prefixed routes (see `localizedPublicPaths`). */
export async function buildPublicSitemap(): Promise<PublicSitemapPage[]> {
  const entries: PublicSitemapPage[] = [];

  for (const path of localizedPublicPaths) {
    if (isExcludedSitemapPath(path)) continue;
    entries.push(...entriesForLocalizedPath(path));
  }

  const funnels = await listActiveInfluencerFunnels();
  for (const funnel of funnels) {
    const lastModified = funnel.updated_at ? new Date(funnel.updated_at) : undefined;
    entries.push(...entriesForLocalizedPath(`/${funnel.slug}`, lastModified));
  }

  const webinars = await fetchPublicWebinarsPage();
  for (const webinar of webinars) {
    const lastModified = webinar.scheduledAt ? new Date(webinar.scheduledAt) : undefined;
    entries.push(...entriesForLocalizedPath(`/webinars/${webinar.id}`, lastModified));
  }

  return entries;
}
