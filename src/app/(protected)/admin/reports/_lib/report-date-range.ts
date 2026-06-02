const MAX_RANGE_DAYS = 366;

export type ReportDateBounds = {
  startDate: string;
  endDate: string;
  startIso: string;
  endExclusiveIso: string;
  rangeLabel: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function defaultReportDateInputs(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(now),
  };
}

function parseLocalDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function reportDateBoundsFromInputs(
  startDate: string,
  endDate: string,
): ReportDateBounds | null {
  const start = parseLocalDateInput(startDate);
  const end = parseLocalDateInput(endDate);
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  if (spanDays > MAX_RANGE_DAYS) return null;

  const startIso = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();

  const endExclusive = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  const endExclusiveIso = endExclusive.toISOString();

  const fmt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const rangeLabel = `${fmt.format(start)} – ${fmt.format(end)}`;

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    startIso,
    endExclusiveIso,
    rangeLabel,
  };
}
