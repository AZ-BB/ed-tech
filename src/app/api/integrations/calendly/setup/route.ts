import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  advisorHasCalendlyConnection,
  buildCalendlyAuthorizeUrl,
  CALENDLY_OAUTH_COOKIE_ADVISOR_ID,
  CALENDLY_OAUTH_COOKIE_MAX_AGE_SEC,
  CALENDLY_OAUTH_COOKIE_STATE,
  CALENDLY_OAUTH_COOKIE_VERIFIER,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  getCalendlyOAuthConfig,
} from "@/lib/calendly-oauth";
import { logCalendly, logCalendlyError } from "@/lib/calendly-log";
import { resolveCalendlyOAuthRedirectBase } from "@/lib/calendly-oauth-redirect";
import { NextResponse } from "next/server";

async function settingsRedirect(calendly: string, request?: Request): Promise<NextResponse> {
  const base = await resolveCalendlyOAuthRedirectBase(request);
  return NextResponse.redirect(new URL(`/advisor/settings?calendly=${calendly}`, base));
}

function oauthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    maxAge: CALENDLY_OAUTH_COOKIE_MAX_AGE_SEC,
    path: "/",
  };
}

export async function GET(request: Request) {
  logCalendly("setup", "OAuth setup requested");

  const access = await assertAdvisorAccess();
  if (!access.ok) {
    logCalendlyError("setup", "Advisor access denied", undefined, { error: access.error });
    const base = await resolveCalendlyOAuthRedirectBase(request);
    return NextResponse.redirect(new URL("/login", base));
  }

  logCalendly("setup", "Advisor authenticated", { advisorId: access.advisorId });

  const config = getCalendlyOAuthConfig();
  if (!config) {
    logCalendlyError("setup", "OAuth env vars missing", undefined, {
      hasClientId: Boolean(process.env.CALENDLY_CLIENT_ID?.trim()),
      hasClientSecret: Boolean(process.env.CALENDLY_CLIENT_SECRET?.trim()),
      hasRedirectUri: Boolean(process.env.CALENDLY_OAUTH_REDIRECT_URI?.trim()),
    });
    return settingsRedirect("error", request);
  }

  const alreadyConnected = await advisorHasCalendlyConnection(access.advisorId);
  if (alreadyConnected) {
    logCalendly("setup", "Advisor already connected — skipping OAuth", {
      advisorId: access.advisorId,
    });
    return settingsRedirect("already_connected", request);
  }

  const state = generateOAuthState();
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const authorizeUrl = buildCalendlyAuthorizeUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
    codeChallenge: challenge,
  });

  logCalendly("setup", "Redirecting to Calendly authorize", {
    advisorId: access.advisorId,
    redirectUri: config.redirectUri,
  });

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOpts = oauthCookieOptions();
  response.cookies.set(CALENDLY_OAUTH_COOKIE_STATE, state, cookieOpts);
  response.cookies.set(CALENDLY_OAUTH_COOKIE_VERIFIER, verifier, cookieOpts);
  response.cookies.set(CALENDLY_OAUTH_COOKIE_ADVISOR_ID, access.advisorId, cookieOpts);

  return response;
}
