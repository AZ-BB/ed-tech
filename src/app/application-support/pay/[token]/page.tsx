import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { resolveApplicationPaymentCheckout } from "@/lib/stripe/resolve-application-payment-checkout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ApplicationSupportPayPage({ params }: PageProps) {
  const { token } = await params;
  const result = await resolveApplicationPaymentCheckout(token);

  if (result.type === "redirect") {
    redirect(result.url);
  }

  if (result.type === "redirect_success") {
    redirect(
      `/application-support/payment/success?application_id=${result.applicationId}`,
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingSubpageNav />

      <main className="flex flex-1 flex-col px-5 pt-[88px] pb-10 sm:pt-[96px]">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
              Payment unavailable
            </h1>
            <p className="mt-2 text-sm text-[var(--text-mid)]">{result.message}</p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
