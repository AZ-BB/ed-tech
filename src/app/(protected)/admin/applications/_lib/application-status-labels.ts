import type { Database } from "@/database.types";

export type ApplicationStatus =
  Database["public"]["Enums"]["application_status"];

export const ADMIN_APPLICATION_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "lead", label: "Lead" },
  { value: "not_suitable", label: "Not Suitable" },
  { value: "payment_requested", label: "Payment Requested" },
  { value: "active_package", label: "Active Package" },
] as const;

export type AdminApplicationStatusFilter =
  | ""
  | ApplicationStatus;

const VALID_STATUSES = new Set<string>(
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(
    Boolean,
  ),
);

/** Legacy application_status values from URLs before simplification. */
const LEGACY_STATUS_TO_CURRENT: Record<string, ApplicationStatus> = {
  new: "lead",
  scheduled: "lead",
  assigned: "lead",
  payment_in_progress: "payment_requested",
  payment_completed: "active_package",
  in_progress: "active_package",
  submitted: "active_package",
  blocked: "not_suitable",
};

export const ADMIN_APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> =
  {
    intake_draft: "Intake Draft",
    lead: "Lead",
    not_suitable: "Not Suitable",
    payment_requested: "Payment Requested",
    active_package: "Active Package",
  };

export function adminApplicationStatusPillClass(status: string): string {
  switch (status) {
    case "intake_draft":
      return "bg-[#EEF2FF] text-[#4338CA]";
    case "lead":
      return "bg-[#FFF3E0] text-[#E67E22]";
    case "not_suitable":
      return "bg-[#FCEBEB] text-[#E74C3C]";
    case "payment_requested":
      return "bg-[#FFF8E1] text-[#F57F17]";
    case "active_package":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    default:
      return "bg-[#f0f0f0] text-[#6a6a6a]";
  }
}

export function parseAdminApplicationStatusParam(
  raw: string | string[] | undefined,
): AdminApplicationStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value) return "";
  const mapped = LEGACY_STATUS_TO_CURRENT[value] ?? value;
  if (!VALID_STATUSES.has(mapped)) return "";
  return mapped as AdminApplicationStatusFilter;
}
