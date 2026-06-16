/** Default checklist rows for application support (per application). */
export const DEFAULT_APPLICATION_CHECKLIST_SLOTS = [
  {
    slot_key: "passport",
    display_name: "Passport",
    sort_order: 0,
    allow_not_applicable: false,
  },
  {
    slot_key: "ib_transcript_predicted",
    display_name: "IB transcript (predicted)",
    sort_order: 1,
    allow_not_applicable: false,
  },
  {
    slot_key: "ielts_certificate",
    display_name: "IELTS certificate",
    sort_order: 2,
    allow_not_applicable: false,
  },
  {
    slot_key: "personal_statement_draft",
    display_name: "Personal statement — draft 2",
    sort_order: 3,
    allow_not_applicable: false,
  },
  {
    slot_key: "cv_resume",
    display_name: "CV / resume",
    sort_order: 4,
    allow_not_applicable: false,
  },
  {
    slot_key: "rec_letter_1",
    display_name: "Recommendation letter — Maths teacher",
    sort_order: 5,
    allow_not_applicable: false,
  },
  {
    slot_key: "rec_letter_2",
    display_name: "Recommendation letter — Economics teacher",
    sort_order: 6,
    allow_not_applicable: false,
  },
  {
    slot_key: "financial_docs",
    display_name: "Financial documents (parent income proof)",
    sort_order: 7,
    allow_not_applicable: false,
  },
  {
    slot_key: "portfolio",
    display_name: "Portfolio / supplementary",
    sort_order: 8,
    allow_not_applicable: true,
  },
] as const;

export const CUSTOM_APPLICATION_CHECKLIST_SLOT_PREFIX = "custom:";

export function isCustomApplicationChecklistSlot(slotKey: string): boolean {
  return slotKey.startsWith(CUSTOM_APPLICATION_CHECKLIST_SLOT_PREFIX);
}

export function makeCustomApplicationChecklistSlotKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${CUSTOM_APPLICATION_CHECKLIST_SLOT_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CUSTOM_APPLICATION_CHECKLIST_SLOT_PREFIX}${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Intake form upload field → checklist slot_key */
export const INTAKE_DOC_SLOT_BY_LEGACY_TYPE: Record<string, string> = {
  transcript: "ib_transcript_predicted",
  english_test_result: "ielts_certificate",
  personal_statement: "personal_statement_draft",
  cv: "cv_resume",
  passport: "passport",
  portfolio: "portfolio",
  recommendation_letter: "rec_letter_1",
};
