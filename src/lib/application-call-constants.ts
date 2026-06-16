export const APPLICATION_CALL_TYPES = [
  "free_intro_call",
  "paid_advisory_session",
  "application_package_session",
  "essay_review_session",
  "parent_consultation",
  "uni_shortlist_call",
] as const;

export type ApplicationCallType = (typeof APPLICATION_CALL_TYPES)[number];

export const APPLICATION_CALL_TYPE_LABEL: Record<ApplicationCallType, string> = {
  free_intro_call: "Free intro call",
  paid_advisory_session: "Paid advisory session",
  application_package_session: "Application package session",
  essay_review_session: "Essay review session",
  parent_consultation: "Parent consultation",
  uni_shortlist_call: "Uni shortlist call",
};

export const APPLICATION_CALL_STATUSES = [
  "scheduled",
  "rescheduled",
  "canceled",
  "no_show",
  "completed",
] as const;

export type ApplicationCallStatus = (typeof APPLICATION_CALL_STATUSES)[number];

export const APPLICATION_CALL_STATUS_LABEL: Record<ApplicationCallStatus, string> = {
  scheduled: "Scheduled",
  rescheduled: "Re-scheduled",
  canceled: "Canceled",
  no_show: "No show",
  completed: "Completed",
};

export const APPLICATION_CALL_OUTCOMES = [
  "needs_more_guidance",
  "package_recommended",
  "payment_request_sent",
  "converted_to_package",
  "not_ready_yet",
  "not_interested",
  "follow_up_required",
] as const;

export type ApplicationCallOutcome = (typeof APPLICATION_CALL_OUTCOMES)[number];

export const APPLICATION_CALL_OUTCOME_LABEL: Record<ApplicationCallOutcome, string> = {
  needs_more_guidance: "Needs more guidance",
  package_recommended: "Package recommended",
  payment_request_sent: "Payment request sent",
  converted_to_package: "Converted to package",
  not_ready_yet: "Not ready yet",
  not_interested: "Not interested",
  follow_up_required: "Follow-up required",
};

export function isApplicationCallType(value: string): value is ApplicationCallType {
  return (APPLICATION_CALL_TYPES as readonly string[]).includes(value);
}

export function isApplicationCallStatus(value: string): value is ApplicationCallStatus {
  return (APPLICATION_CALL_STATUSES as readonly string[]).includes(value);
}

export function isApplicationCallOutcome(value: string): value is ApplicationCallOutcome {
  return (APPLICATION_CALL_OUTCOMES as readonly string[]).includes(value);
}

export function callStatusRequiresOutcome(status: ApplicationCallStatus): boolean {
  return status !== "scheduled" && status !== "canceled";
}

export function applicationCallStatusPillClass(status: ApplicationCallStatus): string {
  switch (status) {
    case "scheduled":
    case "rescheduled":
      return "bg-[#FFF3E0] text-[#E67E22]";
    case "completed":
      return "bg-[#e8f5ee] text-[#2D6A4F]";
    case "canceled":
    case "no_show":
      return "bg-[#ECEAE5] text-[#6b6b6b]";
    default:
      return "bg-[#ECEAE5] text-[#6b6b6b]";
  }
}

export function applicationCallStatusDotClass(status: ApplicationCallStatus): string {
  switch (status) {
    case "scheduled":
    case "rescheduled":
      return "bg-[#E67E22]";
    case "completed":
      return "bg-[#2D6A4F]";
    case "canceled":
    case "no_show":
      return "bg-[#a0a0a0]";
    default:
      return "bg-[#a0a0a0]";
  }
}
