export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvCell(raw: string | null | undefined): string {
  const text = raw?.trim() ?? "";
  return escapeCsvField(text);
}

export function boolToCsv(value: boolean): string {
  return value ? "true" : "false";
}

export function jsonArrayToCsv(value: string[] | null | undefined): string {
  if (!value?.length) return "";
  return JSON.stringify(value);
}

export function commaListToCsv(values: string[] | null | undefined): string {
  if (!values?.length) return "";
  return values.join(",");
}

export function stringListToNewlineText(values: string[] | null | undefined): string {
  if (!values?.length) return "";
  return values.join("\n");
}

export function parseMultilineStringList(
  raw: string,
  options?: { allowCommaFallback?: boolean },
): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Fall through to newline or comma parsing.
    }
  }

  if (/\r?\n/.test(trimmed)) {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (options?.allowCommaFallback && trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

export function rowsToCsvLines(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string[] {
  return [
    headers.map((header) => escapeCsvField(header)).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
}

export function triggerCsvDownload(lines: string[], filename: string) {
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function triggerPublicCsvSampleDownload(publicPath: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = publicPath;
  anchor.download = filename;
  anchor.click();
}

export function personDuplicateKey(
  email: string,
  firstName: string,
  lastName: string,
): string {
  return `${email.trim().toLowerCase()}|${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}
