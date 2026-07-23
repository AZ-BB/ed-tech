import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { requiresFunnelSubscription } from "@/lib/student-subscription";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StudentLayoutShell } from "./_components/student-layout-shell";
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

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <StudentLayoutShell
        locale={locale}
        hasSchoolLinked={auth.hasSchoolLinked}
        featureAccess={auth.featureAccess}
        showFunnelSubscribeCta={showFunnelSubscribeCta}
      >
        {children}
      </StudentLayoutShell>
    </LocaleProvider>
  );
}
