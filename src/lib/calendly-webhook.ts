import { createHmac, timingSafeEqual } from "node:crypto";

const ADVISOR_SESSION_UTM_PREFIX = "advisor_session:";
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

export type CalendlyWebhookEnvelope = {
  event: string;
  payload?: {
    tracking?: {
      utm_content?: string | null;
    };
    scheduled_event?: {
      start_time?: string;
    };
    questions_and_answers?: Array<{
      question?: string;
      answer?: string;
    }>;
  };
};

function parseSignatureHeader(header: string | null): {
  timestamp: string | null;
  signature: string | null;
} {
  if (!header) {
    return { timestamp: null, signature: null };
  }

  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signature = value;
  }

  return { timestamp, signature };
}

/** Verify Calendly-Webhook-Signature: t=<ts>,v1=<hex> over `${timestamp}.${rawBody}`. */
export function verifyCalendlyWebhookSignature(
  rawBody: string,
  header: string | null,
  signingKey: string,
): boolean {
  if (!signingKey.trim()) return false;

  const { timestamp, signature } = parseSignatureHeader(header);
  if (!timestamp || !signature) return false;

  const tsMs = Number.parseInt(timestamp, 10) * 1000;
  if (!Number.isFinite(tsMs)) return false;
  if (Date.now() - tsMs > MAX_SIGNATURE_AGE_MS) return false;

  const expected = createHmac("sha256", signingKey.trim())
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/** Extract advisor_sessions.id from utm_content (e.g. advisor_session:123). */
export function parseAdvisorSessionIdFromTracking(
  utmContent: string | null | undefined,
): number | null {
  if (!utmContent?.trim()) return null;
  const trimmed = utmContent.trim();
  if (!trimmed.startsWith(ADVISOR_SESSION_UTM_PREFIX)) return null;
  const idRaw = trimmed.slice(ADVISOR_SESSION_UTM_PREFIX.length);
  const id = Number.parseInt(idRaw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Fallback: scan a1 / questions_and_answers for "Session ID: 123". */
export function parseAdvisorSessionIdFromContext(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const match = text.match(/Session ID:\s*(\d+)/i);
  if (!match?.[1]) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function resolveAdvisorSessionIdFromWebhook(
  envelope: CalendlyWebhookEnvelope,
): number | null {
  const fromUtm = parseAdvisorSessionIdFromTracking(envelope.payload?.tracking?.utm_content);
  if (fromUtm != null) return fromUtm;

  const answers = envelope.payload?.questions_and_answers ?? [];
  for (const qa of answers) {
    const fromAnswer = parseAdvisorSessionIdFromContext(qa.answer);
    if (fromAnswer != null) return fromAnswer;
  }

  return null;
}
