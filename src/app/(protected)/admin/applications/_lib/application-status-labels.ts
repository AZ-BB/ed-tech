import type { Database } from "@/database.types";

export type ApplicationStatus =
  Database["public"]["Enums"]["application_status"];

export const ADMIN_APPLICATION_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "blocked", label: "Blocked" },
] as const;

export type AdminApplicationStatusFilter =
  | ""
  | ApplicationStatus;

const VALID_STATUSES = new Set<string>(
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS.map((option) => option.value).filter(
    Boolean,
  ),
);

export const ADMIN_APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> =
  {
    new: "New",
    assigned: "Assigned",
    in_progress: "In Progress",
    submitted: "Submitted",
    blocked: "Blocked",
  };

export function adminApplicationStatusPillClass(status: string): string {
  switch (status) {
    case "new":
      return "bg-[#FFF3E0] text-[#E67E22]";
    case "assigned":
      return "bg-[#f0f0f0] text-[#6a6a6a]";
    case "in_progress":
      return "bg-[#E3F2FD] text-[#3498DB]";
    case "submitted":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    case "blocked":
      return "bg-[#FCEBEB] text-[#E74C3C]";
    default:
      return "bg-[#f0f0f0] text-[#6a6a6a]";
  }
}

export function parseAdminApplicationStatusParam(
  raw: string | string[] | undefined,
): AdminApplicationStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !VALID_STATUSES.has(value)) return "";
  return value as AdminApplicationStatusFilter;
}
