import type { Database } from "@/database.types";

type AdvisorSessionStatus = Database["public"]["Enums"]["advisor_session_status"];
type AmbassadorSessionStatus =
  Database["public"]["Enums"]["ambassador_session_request_status"];

export type AdminAdvisorSessionStatusFilter = "" | AdvisorSessionStatus;
export type AdminAmbassadorSessionStatusFilter = "" | AmbassadorSessionStatus;

export const ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ADMIN_AMBASSADOR_SESSION_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
] as const;

export const ADMIN_SESSION_KIND_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "advisor", label: "Advisor" },
  { value: "ambassador", label: "Ambassador" },
] as const;

const ADVISOR_STATUSES = new Set<string>(
  ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS.map((o) => o.value).filter(Boolean),
);

const AMBASSADOR_STATUSES = new Set<string>(
  ADMIN_AMBASSADOR_SESSION_STATUS_FILTER_OPTIONS.map((o) => o.value).filter(Boolean),
);

export const ADMIN_SESSION_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export function adminSessionStatusPillClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-[#FFF3E0] text-[#E67E22]";
    case "confirmed":
      return "bg-[#E3F2FD] text-[#3498DB]";
    case "completed":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    case "cancelled":
      return "bg-[#FCEBEB] text-[#E74C3C]";
    case "rescheduled":
      return "bg-[#F3E5F5] text-[#9B59B6]";
    default:
      return "bg-[#f0f0f0] text-[#6a6a6a]";
  }
}

export function parseAdminAdvisorSessionStatusParam(
  raw: string | string[] | undefined,
): AdminAdvisorSessionStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !ADVISOR_STATUSES.has(value)) return "";
  return value as AdminAdvisorSessionStatusFilter;
}

export function parseAdminAmbassadorSessionStatusParam(
  raw: string | string[] | undefined,
): AdminAmbassadorSessionStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !AMBASSADOR_STATUSES.has(value)) return "";
  return value as AdminAmbassadorSessionStatusFilter;
}

export function sessionKindBadgeClass(kind: "advisor" | "ambassador"): string {
  return kind === "advisor"
    ? "bg-[#E8F5EE] text-[#2D6A4F]"
    : "bg-[#E3F2FD] text-[#3498DB]";
}

export function sessionKindLabel(kind: "advisor" | "ambassador"): string {
  return kind === "advisor" ? "Advisor" : "Ambassador";
}

/** Status options for the session detail dropdown (cancelled is set via Cancel Session only). */
export const ADMIN_ADVISOR_SESSION_STATUS_OPTIONS =
  ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS.filter(
    (o) => o.value !== "" && o.value !== "cancelled",
  );

export const ADMIN_AMBASSADOR_SESSION_STATUS_OPTIONS =
  ADMIN_AMBASSADOR_SESSION_STATUS_FILTER_OPTIONS.filter(
    (o) => o.value !== "" && o.value !== "cancelled",
  );

const SESSION_STATUS_SELECT_BASE_CLASS =
  "cursor-pointer appearance-none rounded-[8px] border bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat text-[12px] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

/** Colored select styling for advisor session status dropdowns. */
export function advisorSessionStatusSelectClass(
  status: string,
  size: "table" | "header" = "table",
): string {
  const sizeClass =
    size === "header"
      ? "min-w-[140px] py-[7px] pl-[10px] pr-9"
      : "min-w-[110px] py-[6px] pl-[10px] pr-8";

  switch (status) {
    case "pending":
      return `${SESSION_STATUS_SELECT_BASE_CLASS} ${sizeClass} border-[#fde68a] bg-[#fffbeb] text-[#b45309]`;
    case "confirmed":
      return `${SESSION_STATUS_SELECT_BASE_CLASS} ${sizeClass} border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]`;
    case "completed":
      return `${SESSION_STATUS_SELECT_BASE_CLASS} ${sizeClass} border-[#b7dfc9] bg-[#f0faf4] text-[#2D6A4F]`;
    default:
      return `${SESSION_STATUS_SELECT_BASE_CLASS} ${sizeClass} border-[#e0deda] bg-white text-[#4a4a4a]`;
  }
}
