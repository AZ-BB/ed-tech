/**
 * Coerce TEXT[] / JSON-array / stringified JSON into a clean string[] for
 * "What you'll do" / "What you'll gain" bullet lists.
 */
export function normalizeInternshipBulletList(v: unknown): string[] {
  let value: unknown = v;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        value = trimmed;
      }
    } else {
      value = trimmed;
    }
  }

  if (typeof value === "string") {
    const parts = value
      .split(/\r?\n|\|/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [value];
  }

  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const nested of parsed) {
            if (typeof nested === "string" && nested.trim()) {
              out.push(nested.trim());
            }
          }
          continue;
        }
      } catch {
        // keep as plain text
      }
    }

    out.push(trimmed);
  }
  return out;
}
