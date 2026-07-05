export function isMeetingOverdue(meetingAt: string | null | undefined): boolean {
  if (!meetingAt) return false;
  const date = new Date(meetingAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}
