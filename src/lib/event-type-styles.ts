export type EventTypeStyleKey =
  | "fair"
  | "open-day"
  | "webinar"
  | "workshop"
  | "info";

export type EventTypeStyle = {
  key: EventTypeStyleKey;
  band: string;
  ink: string;
  heroGradient: string;
};

const TYPE_STYLES: Record<EventTypeStyleKey, EventTypeStyle> = {
  fair: {
    key: "fair",
    band: "#E8F5EE",
    ink: "#2D6A4F",
    heroGradient:
      "linear-gradient(135deg,#1B4332 0%,#2D6A4F 45%,#40916C 100%)",
  },
  "open-day": {
    key: "open-day",
    band: "#EAF3DE",
    ink: "#3B6D11",
    heroGradient:
      "linear-gradient(135deg,#243F0E 0%,#3B6D11 50%,#5A9A1E 100%)",
  },
  webinar: {
    key: "webinar",
    band: "#E6F1FB",
    ink: "#185FA5",
    heroGradient:
      "linear-gradient(135deg,#0C3057 0%,#185FA5 55%,#2E7DCB 100%)",
  },
  workshop: {
    key: "workshop",
    band: "#FAEEDA",
    ink: "#854F0B",
    heroGradient:
      "linear-gradient(135deg,#4A2D08 0%,#854F0B 55%,#B8801E 100%)",
  },
  info: {
    key: "info",
    band: "#EEEDFE",
    ink: "#534AB7",
    heroGradient:
      "linear-gradient(135deg,#272163 0%,#534AB7 55%,#6F66D0 100%)",
  },
};

export function resolveEventTypeStyle(eventType: string | null | undefined): EventTypeStyle {
  const t = (eventType ?? "").trim().toLowerCase();
  if (t.includes("university fair") || t === "fair") return TYPE_STYLES.fair;
  if (t.includes("open day") || t === "open-day") return TYPE_STYLES["open-day"];
  if (t.includes("webinar")) return TYPE_STYLES.webinar;
  if (
    t.includes("workshop") ||
    t.includes("scholarship session") ||
    t.includes("test prep")
  ) {
    return TYPE_STYLES.workshop;
  }
  if (t.includes("info session") || t.includes("career") || t.includes("major talk")) {
    return TYPE_STYLES.info;
  }
  return TYPE_STYLES.fair;
}

export function isOnlineEventMode(mode: string | null | undefined): boolean {
  const m = (mode ?? "").trim().toLowerCase();
  return m === "online" || m.includes("online");
}

export const DEFAULT_WHY_ATTEND: Record<EventTypeStyleKey, string[]> = {
  fair: [
    "Meet admissions reps from many universities in one afternoon",
    "Compare entry requirements and study destinations side by side",
    "Ask about scholarships and funding directly",
    "Walk away with a clearer, shorter shortlist",
  ],
  "open-day": [
    "Go deep on one university — courses, campus and culture",
    "Hear honestly from current students about life there",
    "Get exact entry requirements for your subject",
    "Decide if it genuinely fits you before you apply",
  ],
  webinar: [
    "Learn from admissions experts without leaving home",
    "Understand the process clearly, step by step",
    "Discover scholarships you may be eligible for",
    "Ask your own questions live in the Q&A",
  ],
  workshop: [
    "Get hands-on help with your actual application",
    "Sharpen your essays and personal statement",
    "Avoid common mistakes that cost applicants offers",
    "Leave with concrete next steps, not just theory",
  ],
  info: [
    "Get the specifics on one university or programme",
    "Understand exactly what they look for in applicants",
    "Clarify deadlines, documents and requirements",
    "Ask the questions a brochure never answers",
  ],
};

export function splitSemicolonList(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatEventTimeLabel(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  timezone: string | null | undefined,
): string {
  const start = startTime?.trim();
  const end = endTime?.trim();
  const tz = timezone?.trim();
  if (!start && !end) return "Time to be confirmed";
  if (start && end) {
    return tz ? `${start} – ${end} ${tz}` : `${start} – ${end}`;
  }
  return tz ? `${start || end} ${tz}` : start || end || "Time to be confirmed";
}

export function formatEventDateParts(dateStart: string | null | undefined): {
  day: string;
  month: string;
  monthNum: number;
  full: string;
} {
  if (!dateStart) {
    return { day: "—", month: "TBC", monthNum: 0, full: "Date to be confirmed" };
  }
  const d = new Date(`${dateStart}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { day: "—", month: "TBC", monthNum: 0, full: "Date to be confirmed" };
  }
  return {
    day: String(d.getDate()),
    month: d.toLocaleString("en-US", { month: "short" }),
    monthNum: d.getMonth() + 1,
    full: d.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function eventCountdown(dateStart: string | null | undefined): {
  text: string;
  cls: "past" | "soon" | "near" | "far";
} {
  if (!dateStart) return { text: "Date to be confirmed", cls: "far" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStart}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { text: "Date to be confirmed", cls: "far" };
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { text: "Past event", cls: "past" };
  if (diff === 0) return { text: "Happening today", cls: "soon" };
  if (diff === 1) return { text: "Tomorrow", cls: "soon" };
  if (diff <= 7) return { text: `In ${diff} days`, cls: "soon" };
  if (diff <= 30) return { text: `In ${diff} days`, cls: "near" };
  const f = formatEventDateParts(dateStart);
  return { text: `${f.month} ${f.day}`, cls: "far" };
}

export function eventStatusDotColor(
  countdownCls: "past" | "soon" | "near" | "far",
  registrationStatus: string | null | undefined,
): string {
  const status = registrationStatus?.trim() ?? "";
  if (countdownCls === "past" || status === "Full" || status === "Past Event") {
    return "#a0a0a0";
  }
  if (
    countdownCls === "soon" ||
    status === "Closing Soon" ||
    status === "Not Yet Open"
  ) {
    return "#B08D4F";
  }
  return "#2D6A4F";
}

export function formatRegionFocusLabel(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "Global";
  const key = raw.toLowerCase();
  const labels: Record<string, string> = {
    uk: "United Kingdom",
    us: "United States",
    ca: "Canada",
    au: "Australia",
    eu: "Europe",
    mena: "MENA region",
    global: "Global / multi-country",
  };
  return labels[key] ?? raw;
}

export function isPastEventDate(dateStart: string | null | undefined): boolean {
  if (!dateStart) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStart}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  return d < now;
}
