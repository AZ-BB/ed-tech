import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";

/** Base URL for OAuth redirects — prefer env, else the incoming request origin. */
export async function resolveCalendlyOAuthRedirectBase(request?: Request): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost")) {
    return fromEnv;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return getPublicSiteBaseUrl();
}
