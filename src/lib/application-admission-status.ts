import type { Database } from "@/database.types";

export type ApplicationAdmissionStatus =
  Database["public"]["Enums"]["application_admission_status"];

export const APPLICATION_ADMISSION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "waitlist", label: "Waitlist" },
] as const satisfies ReadonlyArray<{
  value: ApplicationAdmissionStatus;
  label: string;
}>;

const VALID_ADMISSION_STATUSES = new Set<string>(
  APPLICATION_ADMISSION_STATUS_OPTIONS.map((option) => option.value),
);

export const APPLICATION_ADMISSION_STATUS_LABEL: Record<
  ApplicationAdmissionStatus,
  string
> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlist: "Waitlist",
};

export function parseApplicationAdmissionStatus(
  raw: string,
): ApplicationAdmissionStatus | null {
  const value = raw.trim();
  if (!VALID_ADMISSION_STATUSES.has(value)) return null;
  return value as ApplicationAdmissionStatus;
}

export function applicationAdmissionStatusPillClass(status: string): string {
  switch (status) {
    case "accepted":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    case "rejected":
      return "bg-[#FCEBEB] text-[#E74C3C]";
    case "waitlist":
      return "bg-[#EDE7F6] text-[#5E35B1]";
    case "pending":
    default:
      return "bg-[#FFF3E0] text-[#E67E22]";
  }
}
