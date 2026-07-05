type CalendlyLogMeta = Record<string, unknown>;

function formatMeta(meta?: CalendlyLogMeta): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}

/** Structured info log for Calendly flows (visible in Vercel function logs). */
export function logCalendly(scope: string, message: string, meta?: CalendlyLogMeta): void {
  console.log(`[calendly ${scope}] ${message}${formatMeta(meta)}`);
}

/** Structured warning log for Calendly flows. */
export function logCalendlyWarn(scope: string, message: string, meta?: CalendlyLogMeta): void {
  console.warn(`[calendly ${scope}] ${message}${formatMeta(meta)}`);
}

/** Structured error log for Calendly flows. Never pass secrets or tokens in meta. */
export function logCalendlyError(
  scope: string,
  message: string,
  err?: unknown,
  meta?: CalendlyLogMeta,
): void {
  const payload: CalendlyLogMeta = { ...meta };
  if (err !== undefined) {
    payload.err = serializeError(err);
  }
  console.error(`[calendly ${scope}] ${message}${formatMeta(payload)}`);
}
