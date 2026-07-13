import type {
  AnswerFormat,
  CombinedProfileConfig,
  DiscoveryModuleProfile,
  DiscoveryQuestion,
  DiscoveryScaleOption,
  ScaleId,
} from "@/types/discovery";

export function arrayToLines(values: string[]): string {
  return values.join("\n");
}

export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function emptyScaleOption(value = 1): DiscoveryScaleOption {
  return { value, label: "" };
}

export function emptyModuleProfile(index = 1): DiscoveryModuleProfile {
  return {
    profile_id: `profile-${index}`,
    title: "",
    matching_categories: [],
    majors_strong: [],
    majors_related: [],
    majors_stretch: [],
    careers: [],
  };
}

export function emptyCombinedProfile(index = 1): CombinedProfileConfig {
  return {
    profile_id: `dir-profile-${index}`,
    title: "",
    summary: "",
    triggers: [],
  };
}

export function emptyRatingQuestion(
  scale: ScaleId,
  index = 1,
  category = "",
): Extract<DiscoveryQuestion, { response_type: "rating_1_5" }> {
  return {
    item_id: `q${index}`,
    text: "",
    response_type: "rating_1_5",
    scale,
    category,
  };
}

export function emptyForcedQuestion(index = 1): Extract<DiscoveryQuestion, { response_type: "forced_choice" }> {
  return {
    item_id: `q${index}`,
    text: "",
    response_type: "forced_choice",
    optionA: { label: "", category: "" },
    optionB: { label: "", category: "" },
  };
}

export function emptyScenarioQuestion(index = 1): Extract<DiscoveryQuestion, { response_type: "scenario_select" }> {
  return {
    item_id: `q${index}`,
    text: "",
    response_type: "scenario_select",
    options: [
      { label: "", category: "" },
      { label: "", category: "" },
    ],
  };
}

export function defaultQuestionForAnswerFormat(
  answerFormat: AnswerFormat,
  index: number,
  categories: string[],
): DiscoveryQuestion {
  const category = categories[0] ?? "";
  switch (answerFormat) {
    case "interest":
      return emptyRatingQuestion("interest", index, category);
    case "frequency":
      return emptyRatingQuestion("frequency", index, category);
    case "importance":
      return emptyRatingQuestion("importance", index, category);
    case "preference":
      return emptyRatingQuestion("preference", index, category);
    case "forced":
      return emptyForcedQuestion(index);
    case "scenario":
      return emptyScenarioQuestion(index);
    default:
      return emptyRatingQuestion("interest", index, category);
  }
}

export const SCALE_IDS: ScaleId[] = [
  "interest",
  "frequency",
  "importance",
  "preference",
  "forced",
];

export const SCALE_LABELS: Record<ScaleId, string> = {
  interest: "Interest",
  frequency: "Frequency",
  importance: "Importance",
  preference: "Preference",
  forced: "Forced choice (A/B)",
};
