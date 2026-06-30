import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { enUS } from "date-fns/locale/en-US";

import type { Locale } from "./config";

const DATE_FNS_LOCALE: Record<Locale, typeof enUS> = {
  en: enUS,
  ar,
};

/** Relative time label, e.g. "5 minutes ago" / "منذ 5 دقائق". */
export function formatRelativeTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: DATE_FNS_LOCALE[locale],
  });
}
