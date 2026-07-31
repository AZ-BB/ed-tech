export type EventLocationFilter = string;
export type EventMonthFilter = string;
export type EventTypeFilter = string;
export type EventModeFilter = "" | "online" | "inperson";

export type EventDiscoverySearchParams = {
  q: string;
  location: EventLocationFilter;
  month: EventMonthFilter;
  type: EventTypeFilter;
  mode: EventModeFilter;
  detail: string;
};

export const EVENT_MONTH_OPTIONS = [
  { value: "", label: "Month" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export const EVENT_MODE_OPTIONS = [
  { value: "", label: "Format" },
  { value: "online", label: "Online" },
  { value: "inperson", label: "In-person" },
] as const;

function parseString(raw: string | string[] | undefined): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return "";
}

function parseMode(raw: string | string[] | undefined): EventModeFilter {
  const value = parseString(raw);
  if (value === "online" || value === "inperson") return value;
  return "";
}

export function parseEventDiscoverySearchParams(
  sp: Record<string, string | string[] | undefined>,
): EventDiscoverySearchParams {
  return {
    q: parseString(sp.q),
    location: parseString(sp.location),
    month: parseString(sp.month),
    type: parseString(sp.type),
    mode: parseMode(sp.mode),
    detail: parseString(sp.detail),
  };
}
