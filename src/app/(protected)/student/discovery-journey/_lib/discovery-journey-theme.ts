export type ModuleTheme = {
  accent: string;
  accentSoft: string;
  timeLabel: string;
  icon: string;
  outputChips: string[];
};

const MODULE_THEMES: Record<string, ModuleTheme> = {
  "passion-compass": {
    accent: "#2D6A4F",
    accentSoft: "#E8F5EE",
    timeLabel: "4–6 min",
    icon: "M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z",
    outputChips: ["Interest Sparks", "Major clusters", "Career fields"],
  },
  "strengths-studio": {
    accent: "#1B4332",
    accentSoft: "#E8F5EE",
    timeLabel: "4–6 min",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    outputChips: ["Top strengths", "Strengths to develop", "Best-fit task types"],
  },
  "personality-pulse": {
    accent: "#40916C",
    accentSoft: "#F0F7F2",
    timeLabel: "3–5 min",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    outputChips: ["Work style", "Environment fit", "How you collaborate"],
  },
  "motivation-map": {
    accent: "#52B788",
    accentSoft: "#E8F5EE",
    timeLabel: "4–6 min",
    icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z|M12 13a3 3 0 100-6 3 3 0 000 6z",
    outputChips: ["Primary driver", "Secondary driver", "Possible tensions"],
  },
  "learning-dna": {
    accent: "#74C69D",
    accentSoft: "#F0F7F2",
    timeLabel: "4–6 min",
    icon: "M22 12h-4|M2 12h4|M12 2v4|M12 22v-4|M5.6 5.6l2.8 2.8|M15.6 15.6l2.8 2.8|M5.6 18.4l2.8-2.8|M15.6 8.4l2.8-2.8",
    outputChips: ["Study preferences", "Academic environment fit", "University-system fit"],
  },
  "future-pathway": {
    accent: "#1B4332",
    accentSoft: "#F0F7F2",
    timeLabel: "3–4 min",
    icon: "M5 12h14|M12 5l7 7-7 7",
    outputChips: ["Best-fit pathway", "Strong alternative", "Stretch pathway"],
  },
};

const DEFAULT_THEME: ModuleTheme = {
  accent: "#2D6A4F",
  accentSoft: "#E8F5EE",
  timeLabel: "4–6 min",
  icon: "M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z",
  outputChips: [],
};

export function getModuleTheme(moduleId: string): ModuleTheme {
  return MODULE_THEMES[moduleId] ?? DEFAULT_THEME;
}

export function formatLabel(answerFormat: string): string {
  const map: Record<string, string> = {
    interest: "5-point scale",
    frequency: "5-point scale",
    importance: "5-point scale",
    preference: "5-point scale",
    forced: "Either / or",
    scenario: "Scenario choices",
  };
  return map[answerFormat] ?? answerFormat;
}

export function scaleFormatLabel(answerFormat: string): string {
  if (answerFormat === "forced") return "Either / or";
  if (answerFormat === "scenario") return "Scenario choices";
  return "5-point scale";
}
