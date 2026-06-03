/** Normalized key for matching existing rows on re-import (case- and whitespace-insensitive). */
export function normalizeImportNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function displayImportName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
