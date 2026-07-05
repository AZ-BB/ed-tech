import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  buildCalendlyAuthorizeUrl,
  CALENDLY_OAUTH_SCOPES,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from "./calendly-oauth-pkce.ts";

test("generateCodeChallenge is deterministic S256 base64url", () => {
  const verifier = "test-verifier-value";
  const challenge = generateCodeChallenge(verifier);
  const expected = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(challenge, expected);
});

test("generateCodeVerifier and generateOAuthState return non-empty strings", () => {
  assert.ok(generateCodeVerifier().length >= 32);
  assert.ok(generateOAuthState().length >= 16);
});

test("buildCalendlyAuthorizeUrl includes PKCE and scope params", () => {
  const url = new URL(
    buildCalendlyAuthorizeUrl({
      clientId: "client-abc",
      redirectUri: "http://localhost:3000/api/integrations/calendly/callback",
      state: "state-xyz",
      codeChallenge: "challenge-123",
    }),
  );

  assert.equal(url.origin, "https://auth.calendly.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "client-abc");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://localhost:3000/api/integrations/calendly/callback",
  );
  assert.equal(url.searchParams.get("state"), "state-xyz");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), "challenge-123");
  assert.equal(url.searchParams.get("scope"), CALENDLY_OAUTH_SCOPES);
});
