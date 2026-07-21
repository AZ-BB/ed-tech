import { createHash, randomBytes } from "node:crypto";

/** Scopes must match the Calendly OAuth app configuration. */
export const CALENDLY_OAUTH_SCOPES = [
  "users:read",
  "event_types:read",
  "webhooks:read",
  "webhooks:write",
  "scheduled_events:read",
].join(" ");

const CALENDLY_AUTH_BASE = "https://auth.calendly.com";

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function buildCalendlyAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(`${CALENDLY_AUTH_BASE}/oauth/authorize`);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("scope", CALENDLY_OAUTH_SCOPES);
  return url.toString();
}
