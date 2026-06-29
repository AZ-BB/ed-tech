import { format, isValid, parseISO } from "date-fns";

export function formatWebinarDate(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "EEEE, MMMM d, yyyy");
}

export function formatWebinarTime(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return "";
  return format(parsed, "h:mm a");
}
