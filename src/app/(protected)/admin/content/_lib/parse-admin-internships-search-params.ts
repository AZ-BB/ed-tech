export type AdminInternshipsStatusFilter = "" | "active" | "inactive";

export type AdminInternshipsPageFilters = {
  q: string;
  section: string;
  country: string;
  format: string;
  payTier: string;
  status: AdminInternshipsStatusFilter;
  page: number;
  limit: number;
};

export const ADMIN_INTERNSHIPS_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const ADMIN_INTERNSHIPS_SECTION_FILTER_OPTIONS = [
  { value: "", label: "All Sections" },
  { value: "live", label: "Live" },
  { value: "global", label: "Global" },
  { value: "competition", label: "Competition" },
  { value: "find", label: "Find" },
] as const;

export const ADMIN_INTERNSHIPS_FORMAT_FILTER_OPTIONS = [
  { value: "", label: "All Formats" },
  { value: "in_person", label: "In person" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "directory", label: "Directory" },
] as const;

export const ADMIN_INTERNSHIPS_PAY_TIER_FILTER_OPTIONS = [
  { value: "", label: "All Pay" },
  { value: "paid", label: "Paid" },
  { value: "free", label: "Free" },
  { value: "unpaid", label: "Unpaid" },
] as const;

const VALID_STATUSES = new Set<string>(
  ADMIN_INTERNSHIPS_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(Boolean),
);

const VALID_SECTIONS = new Set(
  ADMIN_INTERNSHIPS_SECTION_FILTER_OPTIONS.map((o) => o.value).filter(Boolean),
);

const VALID_FORMATS = new Set(
  ADMIN_INTERNSHIPS_FORMAT_FILTER_OPTIONS.map((o) => o.value).filter(Boolean),
);

const VALID_PAY_TIERS = new Set(
  ADMIN_INTERNSHIPS_PAY_TIER_FILTER_OPTIONS.map((o) => o.value).filter(Boolean),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(
  raw: string | string[] | undefined,
): AdminInternshipsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminInternshipsStatusFilter;
}

function parseEnumParam(
  raw: string | string[] | undefined,
  valid: Set<string>,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !valid.has(value)) return "";
  return value;
}

export function parseAdminInternshipsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminInternshipsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const section = parseEnumParam(sp.section, VALID_SECTIONS);
  const format = parseEnumParam(sp.format, VALID_FORMATS);
  const payTier = parseEnumParam(sp.pay_tier, VALID_PAY_TIERS);
  const status = parseStatusParam(sp.status);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, section, country, format, payTier, status, page, limit };
}
