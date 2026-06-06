import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApplicationSupportPaymentCancelPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const raw =
    typeof sp.application_id === "string"
      ? sp.application_id
      : Array.isArray(sp.application_id)
        ? sp.application_id[0]
        : undefined;
  const applicationId = raw ? Number.parseInt(raw, 10) : NaN;
  const refLabel =
    Number.isFinite(applicationId) && applicationId > 0
      ? `application #${applicationId}`
      : "your application";

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingSubpageNav />

      <main className="flex flex-1 flex-col px-5 pt-[88px] pb-10 sm:pt-[96px]">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
              Payment cancelled
            </h1>
            <p className="mt-2 text-sm text-[var(--text-mid)]">
              No charge was made for {refLabel}. You can return to the payment link
              in your email when you are ready to complete the deposit.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex rounded-[8px] border border-[#e0deda] bg-white px-5 py-2.5 text-sm font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
