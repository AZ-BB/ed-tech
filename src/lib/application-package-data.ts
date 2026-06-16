export const APPLICATION_PACKAGE_LIFECYCLE_KEYS = [
  "intro_call_completed",
  "package_recommended",
  "payment_confirmed",
  "documents_collected",
  "university_shortlist_finalized",
  "personal_statement_reviewed",
  "all_applications_prepared",
  "applications_submitted",
  "proof_of_submission_uploaded",
  "package_completed",
] as const;

export type ApplicationPackageLifecycleKey =
  (typeof APPLICATION_PACKAGE_LIFECYCLE_KEYS)[number];

export const APPLICATION_PACKAGE_LIFECYCLE_LABEL: Record<
  ApplicationPackageLifecycleKey,
  string
> = {
  intro_call_completed: "Intro call completed",
  package_recommended: "Package recommended",
  payment_confirmed: "Payment confirmed",
  documents_collected: "Documents collected",
  university_shortlist_finalized: "University shortlist finalized",
  personal_statement_reviewed: "Personal statement reviewed",
  all_applications_prepared: "All applications prepared",
  applications_submitted: "Applications submitted",
  proof_of_submission_uploaded: "Proof of submission uploaded",
  package_completed: "Package completed",
};

export type ApplicationPackageLifecycle = Record<
  ApplicationPackageLifecycleKey,
  boolean
>;

export type ApplicationPackageData = {
  universitiesAdded: number;
  applicationsSubmitted: number;
  startedAt: string | null;
  /** When set, overrides the plan's universities_count for this application. */
  universitiesTotal: number | null;
  lifecycle: ApplicationPackageLifecycle;
};

export type ApplicationPackageView = ApplicationPackageData & {
  progressPercent: number;
  packageLabel: string;
  universitiesTotal: number;
  totalPaidAed: number;
  startedAtDisplay: string | null;
};

export const DEFAULT_APPLICATION_PACKAGE_DATA: ApplicationPackageData = {
  universitiesAdded: 0,
  applicationsSubmitted: 0,
  startedAt: null,
  universitiesTotal: null,
  lifecycle: {
    intro_call_completed: false,
    package_recommended: false,
    payment_confirmed: false,
    documents_collected: false,
    university_shortlist_finalized: false,
    personal_statement_reviewed: false,
    all_applications_prepared: false,
    applications_submitted: false,
    proof_of_submission_uploaded: false,
    package_completed: false,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function parseLifecycle(value: unknown): ApplicationPackageLifecycle {
  const lifecycle = { ...DEFAULT_APPLICATION_PACKAGE_DATA.lifecycle };
  if (!isRecord(value)) return lifecycle;

  for (const key of APPLICATION_PACKAGE_LIFECYCLE_KEYS) {
    if (typeof value[key] === "boolean") {
      lifecycle[key] = value[key];
    }
  }

  return lifecycle;
}

function parseStartedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function parseUniversitiesTotalOverride(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = parseNonNegativeInt(value, -1);
  if (n < 1) return null;
  return n;
}

export function resolveApplicationUniversitiesTotal(
  packageData: ApplicationPackageData,
  planUniversitiesCount: number,
): number {
  if (packageData.universitiesTotal != null && packageData.universitiesTotal >= 1) {
    return packageData.universitiesTotal;
  }
  return Math.max(0, planUniversitiesCount);
}

export function parseApplicationPackageData(raw: unknown): ApplicationPackageData {
  if (!isRecord(raw)) {
    return { ...DEFAULT_APPLICATION_PACKAGE_DATA };
  }

  return {
    universitiesAdded: parseNonNegativeInt(
      raw.universitiesAdded,
      DEFAULT_APPLICATION_PACKAGE_DATA.universitiesAdded,
    ),
    applicationsSubmitted: parseNonNegativeInt(
      raw.applicationsSubmitted,
      DEFAULT_APPLICATION_PACKAGE_DATA.applicationsSubmitted,
    ),
    startedAt: parseStartedAt(raw.startedAt),
    universitiesTotal: parseUniversitiesTotalOverride(raw.universitiesTotal),
    lifecycle: parseLifecycle(raw.lifecycle),
  };
}

function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
}

export function computePackageProgressPercent(
  data: ApplicationPackageData,
  universitiesTotal: number,
): number {
  const lifecycleDone = APPLICATION_PACKAGE_LIFECYCLE_KEYS.filter(
    (key) => data.lifecycle[key],
  ).length;
  const lifecycleRatio =
    lifecycleDone / Math.max(1, APPLICATION_PACKAGE_LIFECYCLE_KEYS.length);

  const totalUnis = Math.max(1, universitiesTotal);
  const universitiesRatio = Math.min(1, data.universitiesAdded / totalUnis);
  const submittedRatio = Math.min(1, data.applicationsSubmitted / totalUnis);

  const blended =
    lifecycleRatio * 0.5 + universitiesRatio * 0.25 + submittedRatio * 0.25;

  return Math.min(100, Math.round(blended * 100));
}

export function buildApplicationPackageView(input: {
  packageData: ApplicationPackageData;
  planName: string | null;
  universitiesTotal: number;
  totalPaidAed: number;
  fallbackStartedAt: string | null;
}): ApplicationPackageView {
  const packageLabel = input.planName?.trim() || "Application package";
  const startedAt = input.packageData.startedAt ?? input.fallbackStartedAt;

  return {
    ...input.packageData,
    progressPercent: computePackageProgressPercent(
      input.packageData,
      input.universitiesTotal,
    ),
    packageLabel,
    universitiesTotal: Math.max(0, input.universitiesTotal),
    totalPaidAed: input.totalPaidAed,
    startedAtDisplay: formatShortDate(startedAt),
  };
}

export function resolveFirstUncheckedLifecycleLabel(
  packageData: ApplicationPackageData,
): string {
  for (const key of APPLICATION_PACKAGE_LIFECYCLE_KEYS) {
    if (!packageData.lifecycle[key]) {
      return APPLICATION_PACKAGE_LIFECYCLE_LABEL[key];
    }
  }
  return APPLICATION_PACKAGE_LIFECYCLE_LABEL.package_completed;
}
