import clsx from "clsx";

const CARD_BADGE: Record<string, string> = {
  "badge-gov": "bg-[var(--green-bg)] text-[var(--green)]",
  "badge-uni": "bg-[#E6F1FB] text-[#185FA5]",
  "badge-ext": "bg-[#FAEEDA] text-[#854F0B]",
  "badge-foundation": "bg-[#EDE7F6] text-[#5E35B1]",
};

export function cardBadgeClass(badgeClass: string) {
  return clsx(
    "rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
    CARD_BADGE[badgeClass] ?? "bg-[var(--sand)] text-[var(--text-mid)]",
  );
}

export function applyModalTypeBadgeClass(type: string) {
  const t = type.toLowerCase();
  if (t === "government")
    return "rounded-[var(--radius-pill)] border border-[#C8E6C9] bg-[#E8F5EE] px-3 py-1 text-[10px] font-semibold tracking-wide text-[#2D6A4F]";
  if (t === "university")
    return "rounded-[var(--radius-pill)] border border-[#BBDEFB] bg-[#E6F1FB] px-3 py-1 text-[10px] font-semibold tracking-wide text-[#185FA5]";
  if (t === "foundation")
    return "rounded-[var(--radius-pill)] border border-[#D1C4E9] bg-[#EDE7F6] px-3 py-1 text-[10px] font-semibold tracking-wide text-[#5E35B1]";
  return "rounded-[var(--radius-pill)] border border-[var(--border-light)] bg-[var(--sand)] px-3 py-1 text-[10px] font-semibold text-[var(--text-mid)]";
}

export function competitionColor(competition: string) {
  return competition === "Very High" || competition === "High"
    ? "#E65100"
    : "var(--text)";
}
