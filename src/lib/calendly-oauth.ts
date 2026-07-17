import "server-only";

import { logCalendly, logCalendlyError, logCalendlyWarn } from "@/lib/calendly-log";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import {
  buildCalendlyAuthorizeUrl,
  CALENDLY_OAUTH_SCOPES,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from "@/lib/calendly-oauth-pkce";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const CALENDLY_AUTH_BASE = "https://auth.calendly.com";
const CALENDLY_API_BASE = "https://api.calendly.com";

export {
  buildCalendlyAuthorizeUrl,
  CALENDLY_OAUTH_SCOPES,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
};

export const CALENDLY_OAUTH_COOKIE_STATE = "calendly_oauth_state";
export const CALENDLY_OAUTH_COOKIE_VERIFIER = "calendly_oauth_verifier";
export const CALENDLY_OAUTH_COOKIE_ADVISOR_ID = "calendly_oauth_advisor_id";

export const CALENDLY_OAUTH_COOKIE_MAX_AGE_SEC = 600;

export type CalendlyOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type CalendlyTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  owner?: string;
  organization?: string;
};

export type CalendlyCurrentUser = {
  uri: string;
  organization: string;
  email: string;
  name: string;
  scheduling_url?: string;
};

type CalendlyUserApiResource = {
  uri?: string;
  organization?: string;
  current_organization?: string;
  email?: string;
  name?: string;
  scheduling_url?: string;
};

type CalendlyTokenIdentityFallback = {
  owner?: string;
  organization?: string;
};

function resolveCalendlyUserContext(
  user: CalendlyUserApiResource,
  tokenFallback?: CalendlyTokenIdentityFallback,
): { userUri: string; organizationUri: string; email: string; name: string; schedulingUrl?: string } {
  const userUri = user.uri?.trim() || tokenFallback?.owner?.trim() || "";
  const organizationUri =
    user.current_organization?.trim() ||
    user.organization?.trim() ||
    tokenFallback?.organization?.trim() ||
    "";

  return {
    userUri,
    organizationUri,
    email: user.email?.trim() ?? "",
    name: user.name?.trim() ?? "",
    schedulingUrl: user.scheduling_url?.trim() || undefined,
  };
}

function logMissingCalendlyUserContext(
  user: CalendlyUserApiResource,
  tokenFallback: CalendlyTokenIdentityFallback | undefined,
  partial: { userUri: string; organizationUri: string },
): void {
  logCalendlyError("oauth", "Current user response missing uri or organization", undefined, {
    hasUri: Boolean(partial.userUri),
    hasCurrentOrganization: Boolean(user.current_organization?.trim()),
    hasOrganizationField: Boolean(user.organization?.trim()),
    hasTokenOrganization: Boolean(tokenFallback?.organization?.trim()),
    hasTokenOwner: Boolean(tokenFallback?.owner?.trim()),
    hasResolvedOrganization: Boolean(partial.organizationUri),
  });
}

async function fetchOrganizationUriFromMemberships(
  accessToken: string,
  userUri: string,
): Promise<string | null> {
  const encodedUser = encodeURIComponent(userUri);
  const data = await calendlyApiGet<{
    collection?: Array<{ organization?: string; role?: string }>;
  }>(accessToken, `/organization_memberships?user=${encodedUser}`);

  const membership = (data.collection ?? []).find((item) => item.organization?.trim());
  return membership?.organization?.trim() ?? null;
}

export type CalendlyEventType = {
  uri: string;
  scheduling_url: string;
  name: string;
  active: boolean;
};

export type AdvisorCalendlyConnectionPayload = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  userUri: string;
  organizationUri: string;
  schedulingUrl: string;
  eventTypeUri: string;
  webhookSubscriptionUri: string | null;
  connectedAt: string;
};

export function getCalendlyOAuthConfig(): CalendlyOAuthConfig | null {
  const clientId = process.env.CALENDLY_CLIENT_ID?.trim();
  const clientSecret = process.env.CALENDLY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.CALENDLY_OAUTH_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

async function postTokenRequest(body: Record<string, string>): Promise<CalendlyTokenResponse> {
  const config = getCalendlyOAuthConfig();
  if (!config) {
    throw new Error("Calendly OAuth is not configured.");
  }

  const grantType = body.grant_type ?? "unknown";
  logCalendly("oauth", "Token request started", { grantType });

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    ...body,
  });

  const res = await fetch(`${CALENDLY_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as CalendlyTokenResponse & { error?: string; error_description?: string };

  if (!res.ok) {
    const message = data.error_description ?? data.error ?? `Token request failed (${res.status})`;
    logCalendlyError("oauth", "Token request failed", undefined, {
      grantType,
      status: res.status,
      error: data.error ?? null,
      errorDescription: data.error_description ?? null,
    });
    throw new Error(message);
  }

  if (!data.access_token?.trim() || !data.refresh_token?.trim()) {
    logCalendlyError("oauth", "Token response missing tokens", undefined, {
      grantType,
      status: res.status,
      hasAccessToken: Boolean(data.access_token?.trim()),
      hasRefreshToken: Boolean(data.refresh_token?.trim()),
    });
    throw new Error("Calendly token response missing access or refresh token.");
  }

  logCalendly("oauth", "Token request succeeded", {
    grantType,
    expiresIn: data.expires_in ?? null,
    scope: data.scope ?? null,
    owner: data.owner ?? null,
    organization: data.organization ?? null,
  });

  return data;
}

export async function exchangeCalendlyAuthorizationCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<CalendlyTokenResponse> {
  return postTokenRequest({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
}

export async function refreshCalendlyAccessToken(refreshToken: string): Promise<CalendlyTokenResponse> {
  return postTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

function tokenExpiresAtIso(expiresInSec: number): string {
  return new Date(Date.now() + expiresInSec * 1000).toISOString();
}

async function calendlyApiGet<T>(accessToken: string, path: string): Promise<T> {
  logCalendly("api", "GET request", { path });

  const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = (await res.json()) as T & { message?: string; title?: string };

  if (!res.ok) {
    const message =
      (data as { message?: string }).message ??
      (data as { title?: string }).title ??
      `Calendly API GET ${path} failed (${res.status})`;
    logCalendlyError("api", "GET request failed", undefined, {
      path,
      status: res.status,
      message: (data as { message?: string }).message ?? null,
      title: (data as { title?: string }).title ?? null,
    });
    throw new Error(message);
  }

  logCalendly("api", "GET request succeeded", { path, status: res.status });
  return data;
}

async function calendlyApiPost<T>(accessToken: string, path: string, body: unknown): Promise<T> {
  logCalendly("api", "POST request", { path, body });

  const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { message?: string; title?: string };

  if (!res.ok) {
    const message =
      (data as { message?: string }).message ??
      (data as { title?: string }).title ??
      `Calendly API POST ${path} failed (${res.status})`;
    logCalendlyError("api", "POST request failed", undefined, {
      path,
      status: res.status,
      message: (data as { message?: string }).message ?? null,
      title: (data as { title?: string }).title ?? null,
    });
    throw new Error(message);
  }

  logCalendly("api", "POST request succeeded", { path, status: res.status });
  return data;
}

async function calendlyApiDelete(accessToken: string, path: string): Promise<void> {
  logCalendly("api", "DELETE request", { path });

  const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let message = `Calendly API DELETE ${path} failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string; title?: string };
      message = data.message ?? data.title ?? message;
      logCalendlyError("api", "DELETE request failed", undefined, {
        path,
        status: res.status,
        message: data.message ?? null,
        title: data.title ?? null,
      });
    } catch {
      logCalendlyError("api", "DELETE request failed", undefined, {
        path,
        status: res.status,
      });
    }
    throw new Error(message);
  }

  logCalendly("api", "DELETE request succeeded", { path, status: res.status });
}

export async function fetchCalendlyCurrentUser(
  accessToken: string,
  tokenFallback?: CalendlyTokenIdentityFallback,
): Promise<CalendlyCurrentUser> {
  const data = await calendlyApiGet<{ resource: CalendlyUserApiResource }>(accessToken, "/users/me");
  const user = data.resource ?? {};
  let { userUri, organizationUri, email, name, schedulingUrl } = resolveCalendlyUserContext(
    user,
    tokenFallback,
  );

  if (!organizationUri && userUri) {
    try {
      const fromMemberships = await fetchOrganizationUriFromMemberships(accessToken, userUri);
      if (fromMemberships) {
        organizationUri = fromMemberships;
        logCalendly("oauth", "Resolved organization from memberships", {
          organizationUri: fromMemberships,
        });
      }
    } catch (err) {
      logCalendlyWarn("oauth", "Could not load organization memberships", {
        userUri,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!userUri || !organizationUri) {
    logMissingCalendlyUserContext(user, tokenFallback, { userUri, organizationUri });
    throw new Error("Calendly user response missing uri or organization.");
  }

  logCalendly("oauth", "Fetched current user", {
    userUri,
    organizationUri,
    email,
  });

  return {
    uri: userUri,
    organization: organizationUri,
    email,
    name,
    scheduling_url: schedulingUrl,
  };
}

export async function fetchFirstActiveEventType(
  accessToken: string,
  userUri: string,
): Promise<CalendlyEventType> {
  const encodedUser = encodeURIComponent(userUri);
  const data = await calendlyApiGet<{ collection: CalendlyEventType[] }>(
    accessToken,
    `/event_types?user=${encodedUser}&active=true`,
  );

  const eventType = (data.collection ?? []).find(
    (item) => item.active && item.scheduling_url?.trim(),
  );

  if (!eventType) {
    logCalendlyError("oauth", "No active event type found", undefined, {
      userUri,
      eventTypeCount: data.collection?.length ?? 0,
    });
    throw new Error("No active Calendly event type found. Create an event type in Calendly first.");
  }

  logCalendly("oauth", "Selected active event type", {
    eventTypeUri: eventType.uri,
    schedulingUrl: eventType.scheduling_url,
    name: eventType.name,
  });

  return eventType;
}

export async function buildCalendlyWebhookCallbackUrl(): Promise<string> {
  const base = await getPublicSiteBaseUrl();
  return `${base}/api/webhooks/calendly`;
}

type WebhookSubscriptionResource = {
  uri: string;
  callback_url: string;
  state: string;
};

export async function ensureCalendlyWebhookSubscription(opts: {
  accessToken: string;
  organizationUri: string;
  userUri: string;
  existingSubscriptionUri: string | null;
}): Promise<string> {
  const callbackUrl = await buildCalendlyWebhookCallbackUrl();
  logCalendly("oauth", "Ensuring webhook subscription", {
    callbackUrl,
    hasExistingSubscription: Boolean(opts.existingSubscriptionUri?.trim()),
    userUri: opts.userUri,
    organizationUri: opts.organizationUri,
  });

  if (opts.existingSubscriptionUri?.trim()) {
    try {
      const path = new URL(opts.existingSubscriptionUri).pathname;
      const existing = await calendlyApiGet<{ resource: WebhookSubscriptionResource }>(
        opts.accessToken,
        path,
      );
      if (
        existing.resource?.state === "active" &&
        existing.resource.callback_url === callbackUrl
      ) {
        logCalendly("oauth", "Reusing existing webhook subscription", {
          subscriptionUri: existing.resource.uri,
        });
        return existing.resource.uri;
      }
      logCalendlyWarn("oauth", "Existing webhook subscription not reusable — creating new one", {
        existingState: existing.resource?.state ?? null,
        existingCallbackUrl: existing.resource?.callback_url ?? null,
        expectedCallbackUrl: callbackUrl,
      });
    } catch (err) {
      logCalendlyWarn("oauth", "Could not load existing webhook subscription — creating new one", {
        existingSubscriptionUri: opts.existingSubscriptionUri,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const data = await calendlyApiPost<{ resource: WebhookSubscriptionResource }>(
    opts.accessToken,
    "/webhook_subscriptions",
    {
      url: callbackUrl,
      events: ["invitee.created"],
      organization: opts.organizationUri,
      user: opts.userUri,
      scope: "user",
    },
  );

  if (!data.resource?.uri?.trim()) {
    logCalendlyError("oauth", "Webhook subscription response missing uri");
    throw new Error("Calendly webhook subscription response missing uri.");
  }

  logCalendly("oauth", "Created webhook subscription", {
    subscriptionUri: data.resource.uri,
    callbackUrl,
  });

  return data.resource.uri;
}

export async function completeAdvisorCalendlyOAuth(opts: {
  advisorId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  existingWebhookSubscriptionUri: string | null;
}): Promise<AdvisorCalendlyConnectionPayload> {
  logCalendly("oauth", "Completing advisor OAuth flow", { advisorId: opts.advisorId });

  const tokens = await exchangeCalendlyAuthorizationCode({
    code: opts.code,
    codeVerifier: opts.codeVerifier,
    redirectUri: opts.redirectUri,
  });

  const user = await fetchCalendlyCurrentUser(tokens.access_token, {
    owner: tokens.owner,
    organization: tokens.organization,
  });
  const eventType = await fetchFirstActiveEventType(tokens.access_token, user.uri);

  let webhookSubscriptionUri: string | null = null;
  try {
    webhookSubscriptionUri = await ensureCalendlyWebhookSubscription({
      accessToken: tokens.access_token,
      organizationUri: user.organization,
      userUri: user.uri,
      existingSubscriptionUri: opts.existingWebhookSubscriptionUri,
    });
  } catch (err) {
    logCalendlyError("oauth", "Webhook subscription step failed (connection continues)", err, {
      advisorId: opts.advisorId,
    });
  }

  logCalendly("oauth", "Advisor OAuth flow completed", {
    advisorId: opts.advisorId,
    userUri: user.uri,
    schedulingUrl: eventType.scheduling_url.trim(),
    hasWebhookSubscription: Boolean(webhookSubscriptionUri),
  });

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: tokenExpiresAtIso(tokens.expires_in ?? 7200),
    userUri: user.uri,
    organizationUri: user.organization,
    schedulingUrl: eventType.scheduling_url.trim(),
    eventTypeUri: eventType.uri,
    webhookSubscriptionUri,
    connectedAt: new Date().toISOString(),
  };
}

export async function saveAdvisorCalendlyConnection(
  advisorId: string,
  payload: AdvisorCalendlyConnectionPayload,
): Promise<void> {
  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("advisors")
    .update({
      calendly_access_token: payload.accessToken,
      calendly_refresh_token: payload.refreshToken,
      calendly_token_expires_at: payload.tokenExpiresAt,
      calendly_user_uri: payload.userUri,
      calendly_organization_uri: payload.organizationUri,
      calendly_scheduling_url: payload.schedulingUrl,
      calendly_event_type_uri: payload.eventTypeUri,
      calendly_webhook_subscription_uri: payload.webhookSubscriptionUri,
      calendly_connected_at: payload.connectedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", advisorId);

  if (error) {
    logCalendlyError("oauth", "Failed to save advisor Calendly connection", error, { advisorId });
    throw new Error("Could not save Calendly connection.");
  }

  logCalendly("oauth", "Saved advisor Calendly connection", {
    advisorId,
    schedulingUrl: payload.schedulingUrl,
    hasWebhookSubscription: Boolean(payload.webhookSubscriptionUri),
  });
}

export async function advisorHasCalendlyConnection(advisorId: string): Promise<boolean> {
  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("advisors")
    .select("calendly_refresh_token")
    .eq("id", advisorId)
    .maybeSingle();

  if (error) {
    logCalendlyError("oauth", "Failed to check advisor Calendly connection", error, { advisorId });
    return false;
  }

  return Boolean(data?.calendly_refresh_token?.trim());
}

export async function getAdvisorWebhookSubscriptionUri(
  advisorId: string,
): Promise<string | null> {
  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("advisors")
    .select("calendly_webhook_subscription_uri")
    .eq("id", advisorId)
    .maybeSingle();

  if (error) {
    logCalendlyError("oauth", "Failed to load advisor webhook subscription uri", error, {
      advisorId,
    });
    return null;
  }

  return data?.calendly_webhook_subscription_uri?.trim() ?? null;
}

export type AdvisorCalendlyDisconnectContext = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  webhookSubscriptionUri: string | null;
};

export async function getAdvisorCalendlyDisconnectContext(
  advisorId: string,
): Promise<AdvisorCalendlyDisconnectContext | null> {
  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("advisors")
    .select(
      "calendly_access_token, calendly_refresh_token, calendly_token_expires_at, calendly_webhook_subscription_uri",
    )
    .eq("id", advisorId)
    .maybeSingle();

  if (error) {
    logCalendlyError("oauth", "Failed to load advisor Calendly disconnect context", error, {
      advisorId,
    });
    return null;
  }

  if (!data) return null;

  return {
    accessToken: data.calendly_access_token?.trim() || null,
    refreshToken: data.calendly_refresh_token?.trim() || null,
    tokenExpiresAt: data.calendly_token_expires_at?.trim() || null,
    webhookSubscriptionUri: data.calendly_webhook_subscription_uri?.trim() || null,
  };
}

export async function resolveCalendlyAccessTokenForDisconnect(
  ctx: AdvisorCalendlyDisconnectContext,
): Promise<string | null> {
  const expiresAtMs = ctx.tokenExpiresAt ? Date.parse(ctx.tokenExpiresAt) : NaN;
  const accessStillValid =
    Boolean(ctx.accessToken) &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs > Date.now() + 60_000;

  if (accessStillValid && ctx.accessToken) {
    return ctx.accessToken;
  }

  if (!ctx.refreshToken) {
    return ctx.accessToken;
  }

  try {
    const tokens = await refreshCalendlyAccessToken(ctx.refreshToken);
    return tokens.access_token?.trim() || ctx.accessToken;
  } catch (err) {
    logCalendlyWarn("oauth", "Could not refresh access token for disconnect", {
      err: err instanceof Error ? err.message : String(err),
    });
    return ctx.accessToken;
  }
}

export async function deleteCalendlyWebhookSubscription(
  accessToken: string,
  subscriptionUri: string,
): Promise<void> {
  const path = new URL(subscriptionUri).pathname;
  await calendlyApiDelete(accessToken, path);
}

export async function revokeCalendlyRefreshToken(refreshToken: string): Promise<void> {
  const config = getCalendlyOAuthConfig();
  if (!config) {
    throw new Error("Calendly OAuth is not configured.");
  }

  logCalendly("oauth", "Revoking Calendly refresh token");

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    token: refreshToken,
  });

  const res = await fetch(`${CALENDLY_AUTH_BASE}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    let errorBody: { error?: string; error_description?: string } = {};
    try {
      errorBody = (await res.json()) as typeof errorBody;
    } catch {
      // ignore non-JSON body
    }
    const message =
      errorBody.error_description ?? errorBody.error ?? `Token revoke failed (${res.status})`;
    logCalendlyError("oauth", "Token revoke failed", undefined, {
      status: res.status,
      error: errorBody.error ?? null,
      errorDescription: errorBody.error_description ?? null,
    });
    throw new Error(message);
  }

  logCalendly("oauth", "Token revoke succeeded", { status: res.status });
}

export async function clearAdvisorCalendlyConnection(advisorId: string): Promise<void> {
  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("advisors")
    .update({
      calendly_access_token: null,
      calendly_refresh_token: null,
      calendly_token_expires_at: null,
      calendly_user_uri: null,
      calendly_organization_uri: null,
      calendly_scheduling_url: null,
      calendly_event_type_uri: null,
      calendly_webhook_subscription_uri: null,
      calendly_connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", advisorId);

  if (error) {
    logCalendlyError("oauth", "Failed to clear advisor Calendly connection", error, { advisorId });
    throw new Error("Could not disconnect Calendly.");
  }

  logCalendly("oauth", "Cleared advisor Calendly connection", { advisorId });
}

export async function disconnectAdvisorCalendly(advisorId: string): Promise<void> {
  logCalendly("oauth", "Disconnecting advisor Calendly", { advisorId });

  const connected = await advisorHasCalendlyConnection(advisorId);
  if (!connected) {
    logCalendly("oauth", "Advisor Calendly already disconnected — no-op", { advisorId });
    return;
  }

  const ctx = await getAdvisorCalendlyDisconnectContext(advisorId);

  if (ctx) {
    try {
      const accessToken = await resolveCalendlyAccessTokenForDisconnect(ctx);

      if (accessToken && ctx.webhookSubscriptionUri) {
        try {
          await deleteCalendlyWebhookSubscription(accessToken, ctx.webhookSubscriptionUri);
        } catch (err) {
          logCalendlyWarn("oauth", "Could not delete webhook subscription during disconnect", {
            advisorId,
            webhookSubscriptionUri: ctx.webhookSubscriptionUri,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (ctx.refreshToken) {
        try {
          await revokeCalendlyRefreshToken(ctx.refreshToken);
        } catch (err) {
          logCalendlyWarn("oauth", "Could not revoke Calendly token during disconnect", {
            advisorId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      logCalendlyWarn("oauth", "Calendly remote cleanup failed during disconnect", {
        advisorId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await clearAdvisorCalendlyConnection(advisorId);

  logCalendly("oauth", "Advisor Calendly disconnected", { advisorId });
}
