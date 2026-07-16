import type { Database } from "@/database.types";

export type PostAdmissionStatus =
  Database["public"]["Enums"]["post_admission_status"];

export const POST_ADMISSION_STATUS_LABEL: Record<PostAdmissionStatus, string> = {
  intake_draft: "Intake Draft",
  lead: "Lead",
  not_suitable: "Not Suitable",
  payment_requested: "Payment Requested",
  active: "Active",
  completed: "Completed",
};

export const ACTIVE_POST_ADMISSION_STATUSES: PostAdmissionStatus[] = [
  "intake_draft",
  "lead",
  "payment_requested",
  "active",
];

export const POST_ADMISSION_STATUS_FILTER_OPTIONS: {
  value: PostAdmissionStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "intake_draft", label: "Intake Draft" },
  { value: "lead", label: "Lead" },
  { value: "not_suitable", label: "Not Suitable" },
  { value: "payment_requested", label: "Payment Requested" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function postAdmissionStatusPillClass(status: PostAdmissionStatus): string {
  switch (status) {
    case "intake_draft":
      return "bg-[#EEF2FF] text-[#4338CA]";
    case "lead":
      return "bg-[#E8F5EE] text-[#1B4332]";
    case "not_suitable":
      return "bg-[#FCEBEB] text-[#A32D2D]";
    case "payment_requested":
      return "bg-[#FEF9C3] text-[#854D0E]";
    case "active":
      return "bg-[#DCFCE7] text-[#166534]";
    case "completed":
      return "bg-[#E0E7FF] text-[#3730A3]";
    default:
      return "bg-[#f4f3f0] text-[#4a4a4a]";
  }
}
