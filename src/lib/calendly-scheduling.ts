/** Same link as application support — one org Calendly for all students. */
export const CALENDLY_SCHEDULING_BASE_URL =
  process.env.NEXT_PUBLIC_CALENDLY_APPLICATION_SUPPORT_URL?.trim() ||
  "https://calendly.com/admin-univeera/30min";

/** UTM content value linking a Calendly booking back to an advisor session row. */
export function advisorSessionUtmContent(sessionId: number): string {
  return `advisor_session:${sessionId}`;
}

/** UTM content value linking a Calendly booking back to an applications row. */
export function applicationUtmContent(applicationId: number): string {
  return `application:${applicationId}`;
}

/** Build Calendly scheduling page URL with prefill + optional custom field `a1` (context). */
export function buildCalendlySchedulingPageUrl(opts: {
  name: string;
  email: string;
  ctxParts: string[];
  /** Defaults to {@link CALENDLY_SCHEDULING_BASE_URL}. */
  base?: string;
  /** Forwarded in webhook payload.tracking.utm_content (e.g. advisor_session:123). */
  utmContent?: string;
}): string {
  let b = (opts.base ?? CALENDLY_SCHEDULING_BASE_URL).trim();
  if (!/^https?:\/\//i.test(b)) b = `https://${b}`;
  const u = new URL(b);
  if (!u.searchParams.has("hide_gdpr_banner")) {
    u.searchParams.set("hide_gdpr_banner", "1");
  }
  if (!u.searchParams.has("primary_color")) {
    u.searchParams.set("primary_color", "2d6a4f");
  }
  if (opts.name) u.searchParams.set("name", opts.name);
  if (opts.email) u.searchParams.set("email", opts.email);
  if (opts.ctxParts.length) {
    u.searchParams.set("a1", opts.ctxParts.join(" | "));
  }
  if (opts.utmContent?.trim()) {
    u.searchParams.set("utm_content", opts.utmContent.trim());
  }
  return u.toString();
}
