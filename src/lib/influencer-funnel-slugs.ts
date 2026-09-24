const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DYNAMIC_PUBLIC_PATH = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/signup)?$/;

/** First path segments from localized public routes and app portals (keep in sync with i18n config). */
const RESERVED_INFLUENCER_SLUG_LIST = [
  "about",
  "contact",
  "blog",
  "for-schools",
  "for-advisors",
  "privacy",
  "terms",
  "webinars",
  "login",
  "signup",
  "milad",
  "diana",
  "tariq",
  "custom-with-form",
  "code",
  "student",
  "school",
  "admin",
  "advisor",
  "api",
  "pay",
  "recommendation",
  "application-support",
  "post-admission-support",
  "auth",
  "forget-password",
] as const;

export const RESERVED_INFLUENCER_SLUGS: ReadonlySet<string> = new Set(
  RESERVED_INFLUENCER_SLUG_LIST,
);

export function normalizeInfluencerSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidInfluencerSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 64) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_INFLUENCER_SLUGS.has(slug)) return false;
  return true;
}

export function isReservedInfluencerSlug(slug: string): boolean {
  return RESERVED_INFLUENCER_SLUGS.has(slug);
}

/** Public paths like /sara or /sara/signup (no locale prefix). */
export function isDynamicInfluencerPublicPath(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  const match = normalized.match(DYNAMIC_PUBLIC_PATH);
  if (!match) return false;
  const slug = match[1];
  if (!slug || !SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_INFLUENCER_SLUGS.has(slug)) return false;
  return true;
}

export function isDynamicInfluencerSignupPath(pathnameWithoutLocale: string): boolean {
  const normalized =
    pathnameWithoutLocale.endsWith("/") && pathnameWithoutLocale.length > 1
      ? pathnameWithoutLocale.slice(0, -1)
      : pathnameWithoutLocale;

  const match = normalized.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/signup$/);
  if (!match) return false;
  const slug = match[1];
  if (!slug || RESERVED_INFLUENCER_SLUGS.has(slug)) return false;
  return true;
}

export function influencerFunnelLandingVisitPath(slug: string): string {
  return `/ar/${slug}`;
}

export function isValidCalendlySchedulingUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "calendly.com" || host.endsWith(".calendly.com");
  } catch {
    return false;
  }
}
