import "server-only";

import { getStripeClient } from "@/lib/stripe/config";

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)(:\d+)?$/i;

export function normalizePaymentMethodDomain(
  domainOrUrl: string,
): string | null {
  const trimmed = domainOrUrl.trim();
  if (!trimmed) return null;

  try {
    const hostname = trimmed.includes("://")
      ? new URL(trimmed).hostname
      : trimmed.replace(/^\/+|\/+$/g, "").split("/")[0]?.split(":")[0] ?? "";
    const normalized = hostname.trim().toLowerCase();
    if (!normalized || LOCAL_HOST_PATTERN.test(normalized)) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function collectPaymentMethodDomainsFromEnv(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  const domains = new Set<string>();
  for (const candidate of candidates) {
    const domain = candidate ? normalizePaymentMethodDomain(candidate) : null;
    if (domain) domains.add(domain);
  }

  return [...domains];
}

export type RegisterPaymentMethodDomainResult =
  | {
      ok: true;
      domain: string;
      domainId: string;
      applePayStatus: string;
      created: boolean;
    }
  | { ok: false; domain: string; error: string };

async function findExistingDomain(domainName: string) {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const listed = await stripe.paymentMethodDomains.list({ limit: 100 });
  return (
    listed.data.find(
      (entry) => entry.domain_name.toLowerCase() === domainName.toLowerCase(),
    ) ?? null
  );
}

/** Register (and validate) a domain so Apple Pay can appear in the Payment Element. */
export async function registerPaymentMethodDomain(
  domainName: string,
): Promise<RegisterPaymentMethodDomainResult> {
  const normalized = normalizePaymentMethodDomain(domainName);
  if (!normalized) {
    return {
      ok: false,
      domain: domainName,
      error: "Domain must be a public HTTPS hostname (not localhost).",
    };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      domain: normalized,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  try {
    let created = false;
    let domain = await findExistingDomain(normalized);

    if (!domain) {
      domain = await stripe.paymentMethodDomains.create({
        domain_name: normalized,
      });
      created = true;
    }

    domain = await stripe.paymentMethodDomains.validate(domain.id);

    const applePayStatus = domain.apple_pay?.status ?? "unknown";

    return {
      ok: true,
      domain: normalized,
      domainId: domain.id,
      applePayStatus,
      created,
    };
  } catch (error) {
    console.error("[registerPaymentMethodDomain]", error);
    const message =
      error instanceof Error ? error.message : "Could not register domain.";
    return { ok: false, domain: normalized, error: message };
  }
}

/** Register every production domain configured in env vars. */
export async function registerPaymentMethodDomainsFromEnv(): Promise<
  RegisterPaymentMethodDomainResult[]
> {
  const domains = collectPaymentMethodDomainsFromEnv();
  if (domains.length === 0) {
    return [
      {
        ok: false,
        domain: "",
        error:
          "No registrable domain found. Set NEXT_PUBLIC_SITE_URL to your HTTPS production origin.",
      },
    ];
  }

  return Promise.all(domains.map((domain) => registerPaymentMethodDomain(domain)));
}
