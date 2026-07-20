import type { Json } from "@/database.types";

/** Product features shown as Quick Actions / gated navbar items. */
export const STUDENT_FEATURE_KEYS = [
  "personality_overview",
  "program_discovery",
  "universities",
  "scholarships",
  "advisor_sessions",
  "ambassadors",
  "application_support",
  "post_admission",
] as const;

export type StudentFeatureKey = (typeof STUDENT_FEATURE_KEYS)[number];

export type StudentFeatureAccess = Record<StudentFeatureKey, boolean>;

export const STUDENT_FEATURE_LABELS: Record<StudentFeatureKey, string> = {
  personality_overview: "Personality Overview",
  program_discovery: "Program Discovery",
  universities: "Discover Universities",
  scholarships: "Scholarships",
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
  scholarships: "scholarships",
  advisorSessions: "advisor_sessions",
  ambassadors: "ambassadors",
  applicationSupport: "application_support",
  postAdmission: "post_admission",
};

/** Route prefixes gated by feature access. */
export const FEATURE_ROUTE_PREFIXES: { prefix: string; feature: StudentFeatureKey }[] = [
  { prefix: "/student/discovery-journey", feature: "personality_overview" },
  { prefix: "/student/programs", feature: "program_discovery" },
  { prefix: "/student/program-fit-test", feature: "program_discovery" },
  { prefix: "/student/universities", feature: "universities" },
  { prefix: "/student/ai-matching", feature: "universities" },
  { prefix: "/student/scholarships", feature: "scholarships" },
  { prefix: "/student/advisor-sessions", feature: "advisor_sessions" },
  { prefix: "/student/ambassadors", feature: "ambassadors" },
  { prefix: "/student/application-support", feature: "application_support" },
  { prefix: "/student/post-admission-support", feature: "post_admission" },
];

export function defaultStudentFeatureAccess(
  enabled = true,
): StudentFeatureAccess {
  return {
    personality_overview: enabled,
    program_discovery: enabled,
    universities: enabled,
    scholarships: enabled,
    advisor_sessions: enabled,
    ambassadors: enabled,
    application_support: enabled,
    post_admission: enabled,
  };
}

export function parseStudentFeatureAccess(
  raw: Json | null | undefined,
): StudentFeatureAccess {
  const defaults = defaultStudentFeatureAccess(true);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  for (const key of STUDENT_FEATURE_KEYS) {
    const value = obj[key];
    if (typeof value === "boolean") {
      defaults[key] = value;
    }
  }
  return defaults;
}

export function isStudentFeatureEnabled(
  access: StudentFeatureAccess,
  feature: StudentFeatureKey,
): boolean {
  return access[feature] !== false;
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
