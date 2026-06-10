import "server-only";

import { headers } from "next/headers";

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  return trimmed || null;
}

function siteUrlFromEnv(): string | null {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeOrigin(candidate);
    if (normalized) return normalized;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return null;
}

/** Absolute site origin for links in transactional email. */
export async function getPublicSiteBaseUrl(): Promise<string> {
  const fromEnv = siteUrlFromEnv();
  if (fromEnv) return fromEnv;

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

export async function buildResetPasswordPageUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/auth/reset-password`;
}

/** Landing page for recovery links — verification runs only after the user clicks Continue. */
export async function buildPasswordResetConfirmUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/auth/confirm`;
}

export function buildPasswordResetVerifyUrl(
  confirmPageUrl: string,
  hashedToken: string,
): string {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
  });
  return `${confirmPageUrl}?${params.toString()}`;
}

export async function buildRecommendationSubmitUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/recommendation/${encodeURIComponent(trimmed)}`;
}

export async function buildStudentDashboardUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/student`;
}

export async function buildApplicationPaymentUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/application-support/pay/${encodeURIComponent(trimmed)}`;
}
