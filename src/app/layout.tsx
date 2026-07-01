import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Noto_Sans_Arabic } from "next/font/google";
import { cookies, headers } from "next/headers";
import { defaultLocale, getDocumentDirection, isLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import "./globals.css";
import "./landing-page.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "Univeera",
  title: {
    default: "Univeera — From Confusion to Acceptance",
    template: "%s · Univeera",
  },
  description:
    "Discover, prepare, and apply to universities — all in one platform designed to guide students and teachers from first search to acceptance letter.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = rawLocale && isLocale(rawLocale) ? rawLocale : defaultLocale;
  const pathname = headersList.get("x-pathname");
  const dir = getDocumentDirection(locale, pathname);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${dmSerif.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
