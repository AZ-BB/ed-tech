import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { confirmApplicationPaymentFromSession } from "@/lib/stripe/confirm-application-payment-from-session";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = sp[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export default async function ApplicationSupportPaymentSuccessPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const applicationId = Number.parseInt(readParam(sp, "application_id") ?? "", 10);
  const sessionId = readParam(sp, "session_id")?.trim() ?? "";

  if (sessionId) {
    const confirmed = await confirmApplicationPaymentFromSession(sessionId);
    if (!confirmed.ok) {
      console.error("[payment success] confirm session", confirmed.error);
    }
  }

  const refLabel =
    Number.isFinite(applicationId) && applicationId > 0
      ? `Application #${applicationId}`
      : "your application";

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingSubpageNav />

      <main className="flex flex-1 flex-col px-5 pt-[88px] pb-10 sm:pt-[96px]">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="rounded-[14px] border border-[#e8f5ee] bg-white px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f5ee] text-[#2D6A4F]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
              Payment received
            </h1>
            <p className="mt-2 text-sm text-[var(--text-mid)]">
              Thank you. Your application support deposit for {refLabel} has been
              received. Our team will be in touch about next steps.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-[8px] bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign in to Univeera
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
