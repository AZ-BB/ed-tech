import {
  parseApplicationPackageData,
  resolveFirstUncheckedLifecycleLabel,
} from "@/lib/application-package-data";
import { getCountryNameByAlpha2 } from "@/lib/countries";

export type AdvisorStudentManagementStatus =
  | "lead"
  | "not_suitable"
  | "payment_requested"
  | "active_package";

export const ADVISOR_STUDENT_STATUS_LABEL: Record<
  AdvisorStudentManagementStatus,
  string
> = {
  lead: "Lead",
  not_suitable: "Not Suitable",
  payment_requested: "Payment Requested",
  active_package: "Active Package",
};

export type AdvisorStudentStatusFilter = "all" | AdvisorStudentManagementStatus;

export type AdvisorApplicationSnapshot = {
  id: number;
  studentId: string;
  status: string;
  updatedAt: string | null;
  createdAt: string | null;
  packageDataRaw: unknown;
  preferredUniOrCountries: string | null;
  payments: {
    status: string | null;
    paymentRequestSentAt: string | null;
    paymentRequestToken: string | null;
  }[];
};

const STATUS_PRIORITY: Record<AdvisorStudentManagementStatus, number> = {
  active_package: 4,
  payment_requested: 3,
  not_suitable: 2,
  lead: 1,
};

function normalizeApplicationStatus(status: string): AdvisorStudentManagementStatus {
  const value = status.trim();
  if (
    value === "active_package" ||
    value === "payment_requested" ||
    value === "not_suitable" ||
    value === "lead"
  ) {
    return value;
  }
  return "lead";
}

export function deriveStudentManagementStatus(
  apps: AdvisorApplicationSnapshot[],
): AdvisorStudentManagementStatus {
  if (apps.length === 0) return "lead";

  let best: AdvisorStudentManagementStatus = "lead";
  for (const app of apps) {
    const status = normalizeApplicationStatus(app.status);
    if (STATUS_PRIORITY[status] > STATUS_PRIORITY[best]) {
      best = status;
    }
  }
  return best;
}

export function resolveLatestApplication<T extends { updatedAt: string | null; id: number }>(
  apps: T[],
): T | null {
  if (apps.length === 0) return null;

  return [...apps].sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.id - a.id;
  })[0];
}

export function resolveStudentStage(apps: AdvisorApplicationSnapshot[]): string {
  const latest = resolveLatestApplication(
    apps.map((app) => ({
      ...app,
      updatedAt: app.updatedAt,
      id: app.id,
    })),
  );
  if (!latest) return "—";

  const packageData = parseApplicationPackageData(latest.packageDataRaw);
  return resolveFirstUncheckedLifecycleLabel(packageData);
}

export type DestinationPill = {
  countryCode: string;
  label: string;
  count: number;
};

function normalizeCountryLabel(codeOrName: string): string {
  const trimmed = codeOrName.trim();
  if (!trimmed) return "";
  if (trimmed.length === 2) {
    return getCountryNameByAlpha2(trimmed) ?? trimmed.toUpperCase();
  }
  return trimmed;
}

export function aggregateDestinations(input: {
  universityTargetCountries: string[];
  preferredDestinations: string[];
  preferredUniOrCountries: string | null;
}): DestinationPill[] {
  const counts = new Map<string, number>();

  function add(raw: string, weight = 1) {
    const label = normalizeCountryLabel(raw);
    if (!label) return;
    const key = label.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + weight);
  }

  for (const code of input.universityTargetCountries) {
    add(code);
  }

  if (counts.size === 0) {
    for (const dest of input.preferredDestinations) {
      add(dest);
    }
  }

  if (counts.size === 0 && input.preferredUniOrCountries?.trim()) {
    for (const part of input.preferredUniOrCountries.split(/[,;|]/)) {
      add(part);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => ({
      countryCode: key,
      label: key.replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export type DeadlineRiskLevel = "ok" | "soon" | "urgent" | "none";

export function resolveDeadlineRisk(
  deadlines: string[],
): { level: DeadlineRiskLevel; label: string } {
  if (deadlines.length === 0) {
    return { level: "none", label: "—" };
  }

  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayMs = new Date(`${todayYmd}T12:00:00`).getTime();

  let nearestFuture: { days: number; label: string } | null = null;

  for (const raw of deadlines) {
    const due = raw.slice(0, 10);
    const dueMs = new Date(`${due}T12:00:00`).getTime();
    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) continue;

    if (!nearestFuture || diffDays < nearestFuture.days) {
      nearestFuture = {
        days: diffDays,
        label: diffDays === 0 ? "Due today" : `${diffDays}d`,
      };
    }
  }

  if (!nearestFuture) {
    return { level: "ok", label: "On track" };
  }

  if (nearestFuture.days < 3) {
    return { level: "urgent", label: `Urgent: ${nearestFuture.days} days` };
  }
  if (nearestFuture.days < 7) {
    return { level: "soon", label: nearestFuture.label };
  }

  return { level: "ok", label: "On track" };
}

export function advisorStudentStatusPillClass(
  status: AdvisorStudentManagementStatus,
): string {
  switch (status) {
    case "active_package":
      return "bg-[var(--green-bg)] text-[var(--green-dark)]";
    case "payment_requested":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "not_suitable":
      return "bg-[#FCEBEB] text-[#E74C3C]";
    case "lead":
    default:
      return "bg-[#FFF3E0] text-[#E67E22]";
  }
}

export function parseAdvisorStudentStatusFilter(
  raw: string | string[] | undefined,
): AdvisorStudentStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    value === "active_package" ||
    value === "payment_requested" ||
    value === "not_suitable" ||
    value === "lead"
  ) {
    return value;
  }
  return "all";
}
