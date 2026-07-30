export type AdminPaymentStatusFilter = "" | "pending" | "paid" | "failed";

export type AdminPaymentTypeFilter = "" | "application" | "post_admission";

export type AdminPaymentsPageFilters = {
  q: string;
  status: AdminPaymentStatusFilter;
  type: AdminPaymentTypeFilter;
  page: number;
  limit: number;
};

export const ADMIN_PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed / overdue" },
] as const;

export const ADMIN_PAYMENT_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "application", label: "Application" },
  { value: "post_admission", label: "Post-admission" },
] as const;

const VALID_STATUSES = new Set<string>(
  ADMIN_PAYMENT_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

const VALID_TYPES = new Set<string>(
  ADMIN_PAYMENT_TYPE_FILTER_OPTIONS.map((option) => option.value),
);

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusParam(raw: string | string[] | undefined): AdminPaymentStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminPaymentStatusFilter;
}

function parseTypeParam(raw: string | string[] | undefined): AdminPaymentTypeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_TYPES.has(value)) return "";
  return value as AdminPaymentTypeFilter;
}

export function parseAdminPaymentsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminPaymentsPageFilters {
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = parseStatusParam(sp.status);
  const type = parseTypeParam(sp.type);
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 20)));

  return { q, status, type, page, limit };
}
