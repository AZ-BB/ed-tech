/** Minimum lead time before an ambassador session can be requested. */
export const AMBASSADOR_BOOKING_MIN_LEAD_MS = 48 * 60 * 60 * 1000;

export function getEarliestAmbassadorBookingTime(from: Date = new Date()): Date {
  return new Date(from.getTime() + AMBASSADOR_BOOKING_MIN_LEAD_MS);
}

export function isAmbassadorBookingTimeAllowed(
  dateTime: Date,
  from: Date = new Date(),
): boolean {
  return dateTime.getTime() >= getEarliestAmbassadorBookingTime(from).getTime();
}

/** YYYY-MM-DD for `<input type="date" min="...">` in local timezone. */
export function formatDateInputLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HH:mm for `<input type="time" min="...">` in local timezone. */
export function formatTimeInputLocal(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function parseLocalDateTime(date: string, time: string): Date | null {
  const d = date.trim();
  if (!d) return null;
  const t = (time.trim() || "12:00").slice(0, 5);
  const normalized = t.length === 5 ? `${t}:00` : t;
  const parsed = new Date(`${d}T${normalized}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function validateAmbassadorBookingIso(
  iso: string,
  label: string,
  from: Date = new Date(),
): { ok: true; iso: string } | { ok: false; error: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${label} is not a valid date and time.` };
  }
  if (!isAmbassadorBookingTimeAllowed(d, from)) {
    return {
      ok: false,
      error: `${label} must be at least 48 hours from now.`,
    };
  }
  return { ok: true, iso: d.toISOString() };
}
