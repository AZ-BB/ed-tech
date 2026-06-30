import { Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return (
    <div data-locale={locale}>
      <LocaleProvider locale={locale} dict={dict}>
        {children}
      </LocaleProvider>
    </div>
  );
}
