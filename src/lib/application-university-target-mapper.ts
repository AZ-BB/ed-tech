import { flagFromCountryCode } from "@/lib/country-flag-emoji";
import type {
  UniversityDocRequirementStatus,
  UniversityTargetDecision,
  UniversityTargetStatus,
} from "@/lib/application-university-target-constants";

export type UniversityTargetDocumentFileRow = {
  id: string;
  sourceType: "upload" | "checklist_link";
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  uploadedAt: string | null;
  checklistDocumentId: string | null;
};

export type UniversityTargetDocumentRequirementRow = {
  id: string;
  displayName: string;
  status: UniversityDocRequirementStatus;
  sortOrder: number;
  file: UniversityTargetDocumentFileRow | null;
};

export type ApplicationUniversityTargetRow = {
  id: string;
  applicationId: number;
  universityId: string | null;
  universityName: string;
  program: string | null;
  countryCode: string | null;
  countryFlag: string;
  deadline: string | null;
  deadlineDisplay: string;
  portalUrl: string | null;
  status: UniversityTargetStatus;
  decision: UniversityTargetDecision;
  notes: string | null;
  sortOrder: number;
  requirements: UniversityTargetDocumentRequirementRow[];
  documentsSummary: string;
  documentsCompleteCount: number;
  documentsTotalCount: number;
};

type RequirementFileRaw = {
  id: string;
  source_type: string;
  url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string | null;
  checklist_document_id: string | null;
};

type RequirementRaw = {
  id: string;
  display_name: string;
  status: string;
  sort_order: number;
  application_university_document_files: RequirementFileRaw | RequirementFileRaw[] | null;
};

export type UniversityTargetRaw = {
  id: string;
  application_id: number;
  university_id: string | null;
  university_name: string;
  program: string | null;
  country_code: string | null;
  deadline: string | null;
  portal_url: string | null;
  status: string;
  decision: string;
  notes: string | null;
  sort_order: number;
  application_university_document_requirements: RequirementRaw[] | null;
};

function firstEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatDeadlineDisplay(deadline: string | null): string {
  if (!deadline) return "—";
  try {
    return new Date(`${deadline}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function mapFileRow(raw: RequirementFileRaw | null): UniversityTargetDocumentFileRow | null {
  if (!raw) return null;
  const sourceType = raw.source_type === "checklist_link" ? "checklist_link" : "upload";
  return {
    id: raw.id,
    sourceType,
    url: raw.url,
    fileName: raw.file_name,
    fileSize: raw.file_size,
    fileType: raw.file_type,
    uploadedAt: raw.uploaded_at,
    checklistDocumentId: raw.checklist_document_id,
  };
}

function mapRequirementRow(raw: RequirementRaw): UniversityTargetDocumentRequirementRow {
  const file = mapFileRow(firstEmbed(raw.application_university_document_files));
  return {
    id: raw.id,
    displayName: raw.display_name.trim(),
    status: raw.status as UniversityDocRequirementStatus,
    sortOrder: raw.sort_order,
    file,
  };
}

function buildDocumentsSummary(
  requirements: UniversityTargetDocumentRequirementRow[],
): { summary: string; completeCount: number; totalCount: number } {
  const totalCount = requirements.length;
  if (totalCount === 0) {
    return { summary: "—", completeCount: 0, totalCount: 0 };
  }

  const completeCount = requirements.filter(
    (r) => r.status === "complete" || r.status === "not_required",
  ).length;

  if (completeCount === totalCount) {
    return { summary: "Complete", completeCount, totalCount };
  }

  return {
    summary: `${completeCount}/${totalCount}`,
    completeCount,
    totalCount,
  };
}

export function mapApplicationUniversityTargetRow(
  raw: UniversityTargetRaw,
): ApplicationUniversityTargetRow {
  const requirements = (raw.application_university_document_requirements ?? [])
    .map(mapRequirementRow)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));

  const { summary, completeCount, totalCount } = buildDocumentsSummary(requirements);
  const countryCode = raw.country_code?.trim().toUpperCase() || null;

  return {
    id: raw.id,
    applicationId: raw.application_id,
    universityId: raw.university_id,
    universityName: raw.university_name.trim(),
    program: raw.program?.trim() || null,
    countryCode,
    countryFlag: countryCode ? flagFromCountryCode(countryCode) : "🌍",
    deadline: raw.deadline,
    deadlineDisplay: formatDeadlineDisplay(raw.deadline),
    portalUrl: raw.portal_url?.trim() || null,
    status: raw.status as UniversityTargetStatus,
    decision: raw.decision as UniversityTargetDecision,
    notes: raw.notes?.trim() || null,
    sortOrder: raw.sort_order,
    requirements,
    documentsSummary: summary,
    documentsCompleteCount: completeCount,
    documentsTotalCount: totalCount,
  };
}
