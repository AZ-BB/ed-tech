import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { requiresCustomSubscription, requiresFunnelSubscription, requiresIndividualSignupPayment } from "@/lib/student-subscription";
import { getIndividualSignupPricingForRequest } from "@/lib/stripe/individual-signup-pricing";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { StudentLayoutShell } from "./_components/student-layout-shell";
import { StudentPaymentWall } from "./_components/student-payment-wall";
import { StudentSubscriptionWall } from "./_components/student-subscription-wall";
import "../../student-portal.css";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    if (auth.schoolDeactivated) {
      redirect("/login?schoolDeactivated=1");
    }
    if (auth.deactivated) {
      redirect("/login?deactivated=1");
    }
    redirect("/login");
  }

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = rawLocale && isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);

  const showFunnelSubscribeCta = requiresFunnelSubscription(auth);
  const requiresSignupPayment = requiresIndividualSignupPayment(auth);
  const requiresSubscription = requiresCustomSubscription(auth);

  if (requiresSignupPayment) {
    const pricing = await getIndividualSignupPricingForRequest();
    const displayPrice = pricing.displayPrice;

    return (
      <LocaleProvider locale={locale} dict={dict}>
        <Suspense fallback={null}>
          <StudentPaymentWall displayPrice={displayPrice} />
        </Suspense>
      </LocaleProvider>
    );
  }

  if (requiresSubscription) {
    return (
      <LocaleProvider locale={locale} dict={dict}>
        <Suspense fallback={null}>
          <StudentSubscriptionWall />
        </Suspense>
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <StudentLayoutShell
        locale={locale}
        hasSchoolLinked={auth.hasSchoolLinked}
        featureAccess={auth.featureAccess}
        showFunnelSubscribeCta={showFunnelSubscribeCta}
        isCustomStudent={auth.studentType === "custom"}
      >
        {children}
      </StudentLayoutShell>
    </LocaleProvider>
  );
}
