export type MeetingTiming = "past" | "upcoming";

export function isMeetingOverdue(meetingAt: string | null | undefined): boolean {
  return getMeetingTiming(meetingAt) === "past";
}

export function getMeetingTiming(
  meetingAt: string | null | undefined,
): MeetingTiming | null {
  if (!meetingAt) return null;
  const date = new Date(meetingAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() < Date.now() ? "past" : "upcoming";
}

export function meetingTimingLabel(timing: MeetingTiming): string {
  return timing === "past" ? "past" : "upcoming";
}

export function meetingTimingClass(timing: MeetingTiming): string {
  return timing === "past"
    ? "text-[10.5px] font-medium text-[#a0a0a0]"
    : "text-[10.5px] font-medium text-[#2D6A4F]";
}
