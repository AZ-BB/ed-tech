export type AdminEventsStatusFilter = "" | "active" | "draft" | "archived";

export type AdminEventsPageFilters = {
  q: string;
  eventType: string;
  country: string;
  mode: string;
  status: AdminEventsStatusFilter;
  page: number;
  limit: number;
};

export const ADMIN_EVENTS_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

const VALID_STATUSES = new Set<string>(
  ADMIN_EVENTS_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminEventsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminEventsStatusFilter;
}

export function parseAdminEventsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminEventsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const eventType = typeof sp.event_type === "string" ? sp.event_type : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const mode = typeof sp.mode === "string" ? sp.mode : "";
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, eventType, country, mode, status, page, limit };
}
