const BRAND_COLORS = [
  "#0D5C46",
  "#1B4332",
  "#2D6A4F",
  "#0033A0",
  "#005EB8",
  "#7A4FBF",
  "#0B6E4F",
  "#003B5C",
  "#1A6CB5",
  "#8A1538",
  "#B31B1B",
  "#00833E",
  "#5B2C6F",
  "#7D2248",
  "#007A3D",
  "#003DA5",
  "#CE1126",
  "#00694E",
  "#C8102E",
  "#E4002B",
  "#7B1F2F",
  "#205493",
  "#63A375",
  "#0C2340",
  "#1565C0",
  "#3949AB",
  "#F4511E",
  "#6A1B9A",
  "#0A66C2",
  "#009EDB",
  "#5E35B1",
  "#E65100",
  "#D32F2F",
  "#2E7D32",
  "#00796B",
  "#012169",
  "#A51C30",
  "#8C1515",
  "#E91E63",
  "#002147",
] as const;

/** Stable hash → brand color for internship logo initials. */
export function internshipLogoColor(seed: string): string {
  let h = 0;
  const s = seed.trim() || "internship";
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return BRAND_COLORS[h % BRAND_COLORS.length]!;
}

/** Two-letter initials from internship name (mirrors HTML `initials`). */
export function internshipInitials(name: string): string {
  const clean = name.replace(/["\u201C\u201D']/g, "");
  const parts = clean
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);
  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "?";
}
