import { cookies } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return rawLocale && isLocale(rawLocale) ? rawLocale : defaultLocale;
}
