import "server-only";

/** Server-only Resend API key (`RESEND_API_KEY`). */
export function getResendApiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || undefined;
}

/**
 * Default sender for transactional mail (`RESEND_FROM_EMAIL`).
 * Example: `Univeera <noreply@yourdomain.com>`
 */
export function getResendFromEmail(): string | undefined {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || undefined;
}

export function isResendConfigured(): boolean {
  return Boolean(getResendApiKey() && getResendFromEmail());
}
