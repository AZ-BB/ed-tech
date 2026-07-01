import type { Scholarship } from "@/app/(protected)/student/scholarships/_components/types";

export function formatIeltsMinScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return String(score);
}

export function formatToeflMinScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return String(Math.trunc(score));
}

export function buildEnglishReqFromMinScores(
  ieltsMinScore: number | null | undefined,
  toeflMinScore: number | null | undefined,
): string {
  const parts: string[] = [];
  if (ieltsMinScore != null && Number.isFinite(ieltsMinScore)) {
    parts.push(`IELTS ${formatIeltsMinScore(ieltsMinScore)}`);
  }
  if (toeflMinScore != null && Number.isFinite(toeflMinScore)) {
    parts.push(`TOEFL ${formatToeflMinScore(toeflMinScore)}`);
  }
  return parts.join(", ");
}

export function parseScholarshipDocuments(documents: unknown): string[] {
  if (documents == null) return [];
  if (Array.isArray(documents)) {
    return documents.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof documents === "string") {
    const trimmed = documents.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fall through to line split
      }
    }
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export type ScholarshipCoreRequirementRow = {
  academic_eligibility?: string | null;
  ielts_min_score?: number | null;
  toefl_min_score?: number | null;
  sat_policy?: string | null;
  other?: string | null;
  documents?: unknown;
};

function coerceNumericScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Merge authoritative `scholarships` requirement columns into the UI model. */
export function overlayScholarshipCoreRequirementFields(
  scholarship: Scholarship,
  row: ScholarshipCoreRequirementRow,
): Scholarship {
  const ieltsMinScore = coerceNumericScore(row.ielts_min_score);
  const toeflMinScore = coerceNumericScore(row.toefl_min_score);
  const satPolicy = row.sat_policy?.trim() || null;
  const academicFromColumn = row.academic_eligibility?.trim() || "";
  const otherFromColumn = row.other?.trim() || "";
  const docsFromColumn = parseScholarshipDocuments(row.documents);
  const englishFromScores = buildEnglishReqFromMinScores(ieltsMinScore, toeflMinScore);

  const requiredDocs =
    docsFromColumn.length > 0
      ? docsFromColumn
      : scholarship.requiredDocs?.length &&
          scholarship.requiredDocs.some((doc) => doc.trim() && doc !== "—")
        ? scholarship.requiredDocs
        : ["—"];

  return {
    ...scholarship,
    academicElig: academicFromColumn || scholarship.academicElig || "",
    otherElig: otherFromColumn || scholarship.otherElig || "",
    englishReq: englishFromScores || scholarship.englishReq || "",
    requiredDocs,
    ieltsMinScore,
    toeflMinScore,
    satPolicy,
  };
}
