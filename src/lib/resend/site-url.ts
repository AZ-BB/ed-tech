import "server-only";

import { headers } from "next/headers";

/** Absolute site origin for links in transactional email. */
export async function getPublicSiteBaseUrl(): Promise<string> {
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromSite) return fromSite;

  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromApp) return fromApp;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function buildSignupPageUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/signup`;
}

export async function buildLoginPageUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/login`;
}

export async function buildRecommendationSubmitUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/recommendation/${encodeURIComponent(trimmed)}`;
}
