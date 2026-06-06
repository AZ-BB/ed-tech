import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  parseAdvisorSessionIdFromContext,
  parseAdvisorSessionIdFromTracking,
  resolveAdvisorSessionIdFromWebhook,
  verifyCalendlyWebhookSignature,
} from "./calendly-webhook.ts";

function buildSignatureHeader(secret: string, rawBody: string, timestampSec?: number): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret)
    .update(`${ts}.`)
    .update(rawBody)
    .digest("hex");
  return `t=${ts},v1=${sig}`;
}

test("parseAdvisorSessionIdFromTracking extracts id from utm_content", () => {
  assert.equal(parseAdvisorSessionIdFromTracking("advisor_session:42"), 42);
  assert.equal(parseAdvisorSessionIdFromTracking("other:value"), null);
  assert.equal(parseAdvisorSessionIdFromTracking(null), null);
});

test("parseAdvisorSessionIdFromContext extracts id from a1 text", () => {
  assert.equal(
    parseAdvisorSessionIdFromContext("Advisor session with Jane | Session ID: 99 | Stage: Ready"),
    99,
  );
  assert.equal(parseAdvisorSessionIdFromContext("no session here"), null);
});

test("resolveAdvisorSessionIdFromWebhook prefers utm_content", () => {
  const id = resolveAdvisorSessionIdFromWebhook({
    event: "invitee.created",
    payload: {
      tracking: { utm_content: "advisor_session:7" },
      questions_and_answers: [{ answer: "Session ID: 99" }],
    },
  });
  assert.equal(id, 7);
});

test("verifyCalendlyWebhookSignature accepts valid signature", () => {
  const secret = "test-signing-key";
  const body = JSON.stringify({ event: "invitee.created", payload: {} });
  const header = buildSignatureHeader(secret, body);
  assert.equal(verifyCalendlyWebhookSignature(body, header, secret), true);
});

test("verifyCalendlyWebhookSignature rejects tampered body", () => {
  const secret = "test-signing-key";
  const body = JSON.stringify({ event: "invitee.created", payload: {} });
  const header = buildSignatureHeader(secret, body);
  const tampered = body.replace("created", "tampered");
  assert.equal(verifyCalendlyWebhookSignature(tampered, header, secret), false);
});
