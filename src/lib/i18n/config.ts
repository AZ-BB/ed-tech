export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Staff portals are English-only; never inherit RTL from the locale cookie. */
export const ltrOnlyPathPrefixes = ["/school", "/admin", "/advisor"] as const;

export function isLtrOnlyPath(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  return ltrOnlyPathPrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function getDocumentDirection(
  locale: Locale,
  pathname?: string | null,
): "ltr" | "rtl" {
  if (pathname && isLtrOnlyPath(pathname)) {
    return "ltr";
  }
  return getDirection(locale);
}

/** Routes that use the /[locale] prefix in this phase. */
export const localizedPublicPaths = [
  "/",
  "/about",
  "/contact",
  "/blog",
  "/for-schools",
  "/for-advisors",
  "/privacy",
  "/terms",
  "/webinars",
  "/login",
  "/signup",
  "/auth/reset-password",
] as const;

export function isLocalizedPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;

  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  if (localizedPublicPaths.includes(normalized as (typeof localizedPublicPaths)[number])) {
    return true;
  }

  if (normalized.startsWith("/webinars/")) {
    const rest = normalized.slice("/webinars/".length);
    return rest.length > 0 && !rest.includes("/");
  }

  return false;
}

export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path;
  if (path.startsWith("/api") || path.startsWith("/student") || path.startsWith("/school")) {
    return path;
  }
  const base = path === "/" ? `/${locale}` : `/${locale}${path}`;
  return base;
}

export function stripLocaleFromPath(pathname: string): {
  locale: Locale | null;
  pathnameWithoutLocale: string;
} {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (maybeLocale && isLocale(maybeLocale)) {
    const rest = `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/";
    return { locale: maybeLocale, pathnameWithoutLocale: rest };
  }
  return { locale: null, pathnameWithoutLocale: pathname };
}
