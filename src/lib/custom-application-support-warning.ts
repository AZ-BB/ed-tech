export const CUSTOM_APPLICATION_SUPPORT_WARNING_ACK_KEY =
  "custom-app-support-warning-ack";

export function hasCustomApplicationSupportWarningAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CUSTOM_APPLICATION_SUPPORT_WARNING_ACK_KEY) === "1";
}

export function setCustomApplicationSupportWarningAcknowledged(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CUSTOM_APPLICATION_SUPPORT_WARNING_ACK_KEY, "1");
}
