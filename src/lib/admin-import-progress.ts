export type ImportProgressPhase =
  | "universities"
  | "programs"
  | "university_programs"
  | "scholarships"
  | "destinations"
  | "internships";

export type ImportProgressPayload = {
  current: number;
  total: number;
  phase: ImportProgressPhase;
  phaseLabel: string;
};

const PHASE_LABELS: Record<ImportProgressPhase, string> = {
  universities: "Saving universities",
  programs: "Syncing programs",
  university_programs: "Saving university program links",
  scholarships: "Saving scholarships",
  destinations: "Syncing destinations",
  internships: "Saving internships",
};

/** Progress is per Excel data row (not multiplied by internal import phases). */
export function buildImportProgress(
  phase: ImportProgressPhase,
  current: number,
  total: number,
): ImportProgressPayload {
  const base = PHASE_LABELS[phase];
  return {
    current,
    total,
    phase,
    phaseLabel: total > 0 ? `${base} — row ${current} of ${total}` : base,
  };
}
