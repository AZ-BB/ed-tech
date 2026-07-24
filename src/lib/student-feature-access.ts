import type { Json } from "@/database.types";

/** Product features shown as Quick Actions / gated navbar items. */
export const STUDENT_FEATURE_KEYS = [
  "personality_overview",
  "program_discovery",
  "universities",
  "scholarships",
  "internships",
  "essay_review",
  "advisor_sessions",
  "ambassadors",
  "application_support",
  "post_admission",
] as const;

export type StudentFeatureKey = (typeof STUDENT_FEATURE_KEYS)[number];

export type StudentFeatureAccess = Record<StudentFeatureKey, boolean>;

/**
 * When `featureAccess` is omitted entirely (null) for funnel students,
 * these stay off. Keys missing from a provided object always default to false
 * (see `parseStudentFeatureAccess`).
 */
export const FUNNEL_DEFAULT_DISABLED_FEATURES = [
  "internships",
  "essay_review",
] as const satisfies readonly StudentFeatureKey[];

export const STUDENT_FEATURE_LABELS: Record<StudentFeatureKey, string> = {
  personality_overview: "Personality Overview",
  program_discovery: "Program Discovery",
  universities: "Discover Universities",
  scholarships: "Scholarships",
  internships: "Internships",
  essay_review: "Essay Review",
  advisor_sessions: "1:1 Advisor",
  ambassadors: "Ambassadors",
  application_support: "Application Support",
  post_admission: "Post Admission",
};

/** Sidebar nav `id` → feature key (only gated items). */
export const NAV_ID_TO_FEATURE: Partial<Record<string, StudentFeatureKey>> = {
  "personality-check": "personality_overview",
  "program-discovery": "program_discovery",
  "university-search": "universities",
  scholarships: "scholarships",
  internships: "internships",
  "advisor-sessions": "advisor_sessions",
  ambassadors: "ambassadors",
  "application-support": "application_support",
  "post-admission-support": "post_admission",
};

/** Quick action `dictKey` → feature key. */
export const QUICK_ACTION_TO_FEATURE: Record<string, StudentFeatureKey> = {
  personalityOverview: "personality_overview",
  programDiscovery: "program_discovery",
  discoverUniversities: "universities",
  essayReview: "essay_review",
  scholarships: "scholarships",
  internships: "internships",
  advisorSessions: "advisor_sessions",
  ambassadors: "ambassadors",
  applicationSupport: "application_support",
  postAdmission: "post_admission",
};

export type QuickActionDictKey = keyof typeof QUICK_ACTION_TO_FEATURE;

/** Feature key → dashboard i18n `quickActionsItems` / modal item key. */
export const FEATURE_TO_QUICK_ACTION_DICT_KEY: Record<
  StudentFeatureKey,
  QuickActionDictKey
> = {
  personality_overview: "personalityOverview",
  program_discovery: "programDiscovery",
  universities: "discoverUniversities",
  scholarships: "scholarships",
  internships: "internships",
  essay_review: "essayReview",
  advisor_sessions: "advisorSessions",
  ambassadors: "ambassadors",
  application_support: "applicationSupport",
  post_admission: "postAdmission",
};

/** Route prefixes gated by feature access. */
export const FEATURE_ROUTE_PREFIXES: {
  prefix: string;
  feature: StudentFeatureKey;
}[] = [
  { prefix: "/student/discovery-journey", feature: "personality_overview" },
  { prefix: "/student/programs", feature: "program_discovery" },
  { prefix: "/student/program-fit-test", feature: "program_discovery" },
  { prefix: "/student/universities", feature: "universities" },
  { prefix: "/student/ai-matching", feature: "universities" },
  { prefix: "/student/scholarships", feature: "scholarships" },
  { prefix: "/student/internships", feature: "internships" },
  { prefix: "/student/essay-review", feature: "essay_review" },
  { prefix: "/student/advisor-sessions", feature: "advisor_sessions" },
  { prefix: "/student/ambassadors", feature: "ambassadors" },
  { prefix: "/student/application-support", feature: "application_support" },
  { prefix: "/student/post-admission-support", feature: "post_admission" },
];

export function defaultStudentFeatureAccess(
  enabled = true,
  options?: { studentType?: "school" | "individual" | "funnel" },
): StudentFeatureAccess {
  const access: StudentFeatureAccess = {
    personality_overview: enabled,
    program_discovery: enabled,
    universities: enabled,
    scholarships: enabled,
    internships: enabled,
    essay_review: enabled,
    advisor_sessions: enabled,
    ambassadors: enabled,
    application_support: enabled,
    post_admission: enabled,
  };

  if (enabled && options?.studentType === "funnel") {
    for (const key of FUNNEL_DEFAULT_DISABLED_FEATURES) {
      access[key] = false;
    }
  }

  return access;
}

export function parseStudentFeatureAccess(
  raw: Json | null | undefined,
  options?: { studentType?: "school" | "individual" | "funnel" },
): StudentFeatureAccess {
  // No stored/provided list → use type defaults (legacy null = full access).
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultStudentFeatureAccess(true, options);
  }

  // Provided list → opt-in only; any missing key is disabled.
  const access = defaultStudentFeatureAccess(false);
  const obj = raw as Record<string, unknown>;
  for (const key of STUDENT_FEATURE_KEYS) {
    const value = obj[key];
    if (typeof value === "boolean") {
      access[key] = value;
    }
  }
  return access;
}

export function isStudentFeatureEnabled(
  access: StudentFeatureAccess,
  feature: StudentFeatureKey,
): boolean {
  return access[feature] !== false;
}

export function getDisabledStudentFeatures(
  access: StudentFeatureAccess,
): StudentFeatureKey[] {
  return STUDENT_FEATURE_KEYS.filter((key) => !isStudentFeatureEnabled(access, key));
}

export function featureForStudentPath(
  pathname: string,
): StudentFeatureKey | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const { prefix, feature } of FEATURE_ROUTE_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return feature;
    }
  }
  return null;
}

/** Parse feature checkboxes from FormData (`feature_<key>` = "on" / "1" / "true"). */
export function parseFeatureAccessFromFormData(
  formData: FormData,
): StudentFeatureAccess {
  const access = defaultStudentFeatureAccess(false);
  for (const key of STUDENT_FEATURE_KEYS) {
    const raw = String(formData.get(`feature_${key}`) ?? "")
      .trim()
      .toLowerCase();
    access[key] = raw === "on" || raw === "1" || raw === "true" || raw === "yes";
  }
  return access;
}
