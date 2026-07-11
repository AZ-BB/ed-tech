export const POST_ADMISSION_SERVICE_KEYS = [
  "visaSupport",
  "accommodation",
  "tuitionPayment",
  "scholarshipSearch",
  "healthTravelInsurance",
  "flightBooking",
  "other",
] as const;

export type PostAdmissionServiceKey = (typeof POST_ADMISSION_SERVICE_KEYS)[number];

export const POST_ADMISSION_SERVICE_LABELS: Record<
  Exclude<PostAdmissionServiceKey, "other">,
  string
> = {
  visaSupport: "Visa Support",
  accommodation: "Accommodation",
  tuitionPayment: "Tuition Payment",
  scholarshipSearch: "Scholarship Search",
  healthTravelInsurance: "Health & Travel Insurance",
  flightBooking: "Flight Booking",
};

export function isPostAdmissionServiceKey(
  value: string | null | undefined,
): value is PostAdmissionServiceKey {
  if (!value) return false;
  return (POST_ADMISSION_SERVICE_KEYS as readonly string[]).includes(value);
}

export function formatPostAdmissionServiceLabel(
  selectedService: string | null | undefined,
  serviceOtherDetail?: string | null,
): string {
  if (!selectedService) return "—";
  if (selectedService === "other") {
    const detail = serviceOtherDetail?.trim();
    return detail ? `Other — ${detail}` : "Other";
  }
  if (isPostAdmissionServiceKey(selectedService) && selectedService !== "other") {
    return POST_ADMISSION_SERVICE_LABELS[selectedService];
  }
  return selectedService;
}
