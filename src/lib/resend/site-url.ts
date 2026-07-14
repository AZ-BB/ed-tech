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

/** Supabase password recovery redirect — must be listed in Supabase Auth redirect URLs. */
export async function buildPasswordResetRedirectUrl(): Promise<string> {
  const base = await getPublicSiteBaseUrl();
  const next = encodeURIComponent("/auth/reset-password");
  return `${base}/auth/confirm?next=${next}`;
}

export async function buildRecommendationSubmitUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/recommendation/${encodeURIComponent(trimmed)}`;
}

export async function buildStudentMyApplicationsUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/student/my-applications`;
}

export async function buildStudentDashboardUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/student`;
}

export async function buildStudentAdvisorSessionsUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/student/advisor-sessions`;
}

export async function buildStudentPostAdmissionSupportUrl(): Promise<string> {
  return `${await getPublicSiteBaseUrl()}/student/post-admission-support`;
}

export async function buildApplicationPaymentUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/application-support/pay/${encodeURIComponent(trimmed)}`;
}

export async function buildPostAdmissionPaymentUrl(token: string): Promise<string> {
  const trimmed = token.trim();
  return `${await getPublicSiteBaseUrl()}/post-admission-support/pay/${encodeURIComponent(trimmed)}`;
}
