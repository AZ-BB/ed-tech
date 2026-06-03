export type ImportFieldChange = {
  field: string;
  before: string;
  after: string;
};

export type ImportRowAddition = {
  rowNumber: number;
  name: string;
};

export type ImportRowUpdate = {
  rowNumber: number;
  name: string;
  changes: ImportFieldChange[];
};

export const MAX_CHANGES_PER_ROW = 20;
export const MAX_UPDATED_ROWS_IN_RESPONSE = 500;

export function stringifyImportValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

export function normalizeCompareString(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCompareInteger(value: string): string {
  const t = value.trim();
  if (!t) return "";
  const n = Number.parseInt(t.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? String(n) : t;
}

export function normalizeCompareDecimal(value: string): string {
  const t = value.trim();
  if (!t) return "";
  const n = Number.parseFloat(t.replace(/,/g, ""));
  if (!Number.isFinite(n)) return t;
  if (Number.isInteger(n)) return String(Math.trunc(n));
  return String(n);
}

export function normalizeCompareBoolean(value: string, defaultValue: boolean): string {
  const t = value.trim().toLowerCase();
  if (!t) return defaultValue ? "true" : "false";
  if (t === "true" || t === "1" || t === "yes" || t === "y") return "true";
  if (t === "false" || t === "0" || t === "no" || t === "n") return "false";
  return defaultValue ? "true" : "false";
}

export function diffImportRecords(
  before: Record<string, string>,
  after: Record<string, string>,
  fieldOrder: string[],
): ImportFieldChange[] {
  const changes: ImportFieldChange[] = [];

  for (const field of fieldOrder) {
    const b = before[field] ?? "";
    const a = after[field] ?? "";
    if (b !== a) {
      changes.push({ field, before: b, after: a });
    }
  }

  return capFieldChanges(changes);
}

export function capFieldChanges(changes: ImportFieldChange[]): ImportFieldChange[] {
  if (changes.length <= MAX_CHANGES_PER_ROW) return changes;
  const kept = changes.slice(0, MAX_CHANGES_PER_ROW);
  const extra = changes.length - MAX_CHANGES_PER_ROW;
  kept.push({
    field: "…",
    before: "",
    after: `and ${extra} more field${extra === 1 ? "" : "s"}`,
  });
  return kept;
}

export function mergeFieldChanges(
  base: ImportFieldChange[],
  extra: ImportFieldChange[],
): ImportFieldChange[] {
  const byField = new Map<string, ImportFieldChange>();
  for (const change of base) {
    byField.set(change.field, change);
  }
  for (const change of extra) {
    byField.set(change.field, change);
  }
  return capFieldChanges([...byField.values()]);
}

export function pushUpdatedRow(
  updated: ImportRowUpdate[],
  entry: ImportRowUpdate,
  totalUpdatedCount: { value: number },
): void {
  totalUpdatedCount.value++;
  if (updated.length < MAX_UPDATED_ROWS_IN_RESPONSE) {
    updated.push(entry);
  }
}
