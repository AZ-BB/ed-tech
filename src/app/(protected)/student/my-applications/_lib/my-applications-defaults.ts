/** Predefined document checklist rows (slot_key unique per student). */
export const DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS = [
  {
    slot_key: "predicted",
    display_name: "Predicted",
    description:
      "Predicted grades or outcomes — your school enters this; it is read-only for you.",
  },
  { slot_key: "passport", display_name: "Passport", description: null as string | null },
  { slot_key: "transcript", display_name: "Transcript", description: null },
  { slot_key: "cv_resume", display_name: "CV / Resume", description: null },
  {
    slot_key: "english_certificate",
    display_name: "IELTS / TOEFL certificate",
    description: null,
  },
  {
    slot_key: "sat_act_report",
    display_name: "SAT / ACT score report",
    description: null,
  },
  {
    slot_key: "scholarship_docs",
    display_name: "Scholarship application documents",
    description: "If applying for scholarships (Chevening, Said Foundation, etc.)",
  },
  {
    slot_key: "financial_docs",
    display_name: "Financial / sponsor documents",
    description: "If applying for need-based aid",
  },
  {
    slot_key: "portfolio",
    display_name: "Portfolio",
    description: "Required only for art / design / architecture programs",
  },
] as const;

/** School fills this via portal; students cannot edit the row (RLS). */
export const SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY = "predicted";

export const UNIVERSITY_APPLICATION_STATUSES = [
  "considering",
  "shortlisted",
  "preparing_application",
  "submitted",
  "interview_invited",
  "withdrawn",
] as const;

export const UNIVERSITY_DECISIONS = [
  "",
  "pending",
  "offer_received",
  "conditional_offer",
  "waitlisted",
  "rejected",
  "accepted",
  "declined_by_me",
] as const;

export const ESSAY_STATUSES = ["not_started", "drafting", "in_review", "complete"] as const;

export const RECOMMENDATION_STATUSES = ["pending", "drafting", "submitted"] as const;

export const CURRICULUM_OPTIONS = [
  "IB Diploma (DP)",
  "IB Career-related (CP)",
  "British — A-Levels",
  "British — IGCSE / GCSE",
  "British — BTEC",
  "American — High School Diploma",
  "American — AP",
  "Cambridge Pre-U",
  "French Baccalauréat",
  "German Abitur",
  "Indian — CBSE",
  "Indian — ICSE / ISC",
  "SABIS",
  "Lebanese Baccalaureate",
  "UAE National (MOE)",
  "Saudi National (Tawjihi)",
  "Egyptian Thanaweya Amma",
  "Other",
] as const;

export const GRADE_OPTIONS = ["Grade 11", "Grade 12", "Year 13"] as const;

export const TARGET_INTAKE_OPTIONS = [
  "Sep 2027",
  "Jan 2028",
  "Sep 2028",
  "Jan 2029",
  "Sep 2029",
  "Sep 2030",
  "Gap year — undecided",
] as const;

export const BUDGET_OPTIONS = [
  "Under $20,000",
  "$20,000–$40,000",
  "$40,000–$60,000",
  "Over $60,000",
  "Need scholarship",
  "I'm not sure yet",
] as const;

export const AID_OPTIONS = [
  "No, my family can fund this",
  "Maybe — exploring options",
  "Yes — scholarships are essential",
] as const;

export const APPLICATION_METHOD_OPTIONS = [
  "UCAS — UK undergraduate",
  "Common App — US universities",
  "Coalition App — US universities",
  "UC App — University of California",
  "Cal State Apply — California State universities",
  "OUAC — Ontario universities (Canada)",
  "BCcampus / ApplyBC — British Columbia (Canada)",
  "Direct application via university website",
  "UAC — Australia (NSW/ACT)",
  "QTAC / VTAC — Australia (other states)",
  "Studielink — Netherlands",
  "UniAssist — Germany",
  "Parcoursup — France",
  "CAO — Ireland",
  "Other",
] as const;

export const ESSAY_TYPE_OPTIONS = [
  "Personal statement",
  "University-specific supplemental",
  '"Why this university" essay',
  "Common App essay",
  "Coalition App essay",
  "UC personal insight",
  "Scholarship essay",
  "Diversity / background statement",
  "Other",
] as const;
