import {
  CALENDLY_OAUTH_COOKIE_ADVISOR_ID,
  CALENDLY_OAUTH_COOKIE_STATE,
  CALENDLY_OAUTH_COOKIE_VERIFIER,
  completeAdvisorCalendlyOAuth,
  getAdvisorWebhookSubscriptionUri,
  getCalendlyOAuthConfig,
  saveAdvisorCalendlyConnection,
} from "@/lib/calendly-oauth";
import { logCalendly, logCalendlyError } from "@/lib/calendly-log";
import { resolveCalendlyOAuthRedirectBase } from "@/lib/calendly-oauth-redirect";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function settingsRedirect(calendly: string, request: Request): Promise<NextResponse> {
  const base = await resolveCalendlyOAuthRedirectBase(request);
  const response = NextResponse.redirect(new URL(`/advisor/settings?calendly=${calendly}`, base));
  response.cookies.delete(CALENDLY_OAUTH_COOKIE_STATE);
  response.cookies.delete(CALENDLY_OAUTH_COOKIE_VERIFIER);
  response.cookies.delete(CALENDLY_OAUTH_COOKIE_ADVISOR_ID);
  return response;
}

export async function GET(request: Request) {
  logCalendly("callback", "OAuth callback received");

  const config = getCalendlyOAuthConfig();
  if (!config) {
    logCalendlyError("callback", "OAuth env vars missing", undefined, {
      hasClientId: Boolean(process.env.CALENDLY_CLIENT_ID?.trim()),
      hasClientSecret: Boolean(process.env.CALENDLY_CLIENT_SECRET?.trim()),
      hasRedirectUri: Boolean(process.env.CALENDLY_OAUTH_REDIRECT_URI?.trim()),
    });
    return settingsRedirect("error", request);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const oauthError = url.searchParams.get("error")?.trim();
  const oauthErrorDescription = url.searchParams.get("error_description")?.trim();

  if (oauthError) {
    logCalendlyError("callback", "Calendly returned OAuth error", undefined, {
      oauthError,
      oauthErrorDescription: oauthErrorDescription ?? null,
    });
    return settingsRedirect("error", request);
  }

  if (!code || !state) {
    logCalendlyError("callback", "Missing code or state query params", undefined, {
      hasCode: Boolean(code),
      hasState: Boolean(state),
    });
    return settingsRedirect("error", request);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(CALENDLY_OAUTH_COOKIE_STATE)?.value;
  const verifier = cookieStore.get(CALENDLY_OAUTH_COOKIE_VERIFIER)?.value;
  const advisorId = cookieStore.get(CALENDLY_OAUTH_COOKIE_ADVISOR_ID)?.value;

  if (!storedState || !verifier || !advisorId || storedState !== state) {
    logCalendlyError("callback", "Invalid OAuth state or missing cookies", undefined, {
      hasStoredState: Boolean(storedState),
      hasVerifier: Boolean(verifier),
      hasAdvisorId: Boolean(advisorId),
      stateMatches: storedState === state,
    });
    return settingsRedirect("error", request);
  }

  logCalendly("callback", "OAuth state validated — completing connection", { advisorId });

  try {
    const existingWebhookUri = await getAdvisorWebhookSubscriptionUri(advisorId);
    logCalendly("callback", "Exchanging authorization code", {
      advisorId,
      hasExistingWebhook: Boolean(existingWebhookUri),
    });

    const connection = await completeAdvisorCalendlyOAuth({
      advisorId,
      code,
      codeVerifier: verifier,
      redirectUri: config.redirectUri,
      existingWebhookSubscriptionUri: existingWebhookUri,
    });

    logCalendly("callback", "Saving advisor Calendly connection", {
      advisorId,
      userUri: connection.userUri,
      eventTypeUri: connection.eventTypeUri,
      schedulingUrl: connection.schedulingUrl,
      hasWebhookSubscription: Boolean(connection.webhookSubscriptionUri),
    });

    await saveAdvisorCalendlyConnection(advisorId, connection);

    logCalendly("callback", "OAuth connection completed successfully", { advisorId });
    return settingsRedirect("connected", request);
  } catch (err) {
    logCalendlyError("callback", "OAuth completion failed", err, { advisorId });
    return settingsRedirect("error", request);
  }
}
