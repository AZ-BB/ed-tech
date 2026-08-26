import type { Locale } from "@/lib/i18n/config";
import { ar, enUS } from "date-fns/locale";
import { format, isValid, parseISO } from "date-fns";

function dateFnsLocale(locale: Locale) {
  return locale === "ar" ? ar : enUS;
}

export function formatWebinarDate(iso: string, locale: Locale = "en"): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "EEEE, MMMM d, yyyy", { locale: dateFnsLocale(locale) });
}

export function formatWebinarTime(iso: string, locale: Locale = "en"): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return "";
  return format(parsed, "h:mm a", { locale: dateFnsLocale(locale) });
}
