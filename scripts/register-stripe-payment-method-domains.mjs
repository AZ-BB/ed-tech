import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: ".env.local" });
dotenv.config();

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)(:\d+)?$/i;

function normalizePaymentMethodDomain(domainOrUrl) {
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

function collectDomainsFromEnv() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  const domains = new Set();
  for (const candidate of candidates) {
    const domain = candidate ? normalizePaymentMethodDomain(candidate) : null;
    if (domain) domains.add(domain);
  }
  return [...domains];
}

async function findExistingDomain(stripe, domainName) {
  const listed = await stripe.paymentMethodDomains.list({ limit: 100 });
  return (
    listed.data.find(
      (entry) => entry.domain_name.toLowerCase() === domainName.toLowerCase(),
    ) ?? null
  );
}

async function registerDomain(stripe, domainName) {
  let created = false;
  let domain = await findExistingDomain(stripe, domainName);

  if (!domain) {
    domain = await stripe.paymentMethodDomains.create({
      domain_name: domainName,
    });
    created = true;
  }

  domain = await stripe.paymentMethodDomains.validate(domain.id);

  return {
    domain: domainName,
    domainId: domain.id,
    created,
    applePayStatus: domain.apple_pay?.status ?? "unknown",
    googlePayStatus: domain.google_pay?.status ?? "unknown",
  };
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    console.error("Missing STRIPE_SECRET_KEY.");
    process.exit(1);
  }

  const domains = collectDomainsFromEnv();
  if (domains.length === 0) {
    console.error(
      "No registrable domain found. Set NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_APP_URL) to your HTTPS production origin.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  console.log(`Registering ${domains.length} domain(s) with Stripe…`);

  let hadFailure = false;
  for (const domain of domains) {
    try {
      const result = await registerDomain(stripe, domain);
      console.log(
        `${result.created ? "Created" : "Validated"} ${result.domain} (${result.domainId})`,
      );
      console.log(
        `  Apple Pay: ${result.applePayStatus} · Google Pay: ${result.googlePayStatus}`,
      );
      if (result.applePayStatus !== "active") {
        console.warn(
          `  Apple Pay is not active on ${result.domain}. Confirm the domain in Stripe Dashboard → Settings → Payment method domains.`,
        );
      }
    } catch (error) {
      hadFailure = true;
      const message =
        error instanceof Error ? error.message : "Unknown registration error.";
      console.error(`Failed for ${domain}: ${message}`);
    }
  }

  if (hadFailure) {
    process.exit(1);
  }
}

main();
