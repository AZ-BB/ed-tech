import type { DiscoveryModuleContentAr, DiscoverySettingsContentAr } from "@/lib/discovery-translatable-fields";

export function emptyModuleContentAr(): DiscoveryModuleContentAr {
  return {};
}

export function emptySettingsContentAr(): DiscoverySettingsContentAr {
  return {};
}

export function getModuleScalarAr(
  contentAr: DiscoveryModuleContentAr,
  key: "title" | "subtitle" | "description",
): string {
  return contentAr[key] ?? "";
}

export function setModuleScalarAr(
  contentAr: DiscoveryModuleContentAr,
  key: "title" | "subtitle" | "description",
  value: string,
): DiscoveryModuleContentAr {
  return { ...contentAr, [key]: value || undefined };
}

export function getModuleCategoriesAr(contentAr: DiscoveryModuleContentAr, index: number): string {
  return contentAr.categories?.[index] ?? "";
}

export function setModuleCategoriesAr(
  contentAr: DiscoveryModuleContentAr,
  categories: string[],
): DiscoveryModuleContentAr {
  return { ...contentAr, categories: categories.length > 0 ? categories : undefined };
}

export function getQuestionTextAr(contentAr: DiscoveryModuleContentAr, itemId: string): string {
  return contentAr.questions?.[itemId]?.text ?? "";
}

export function setQuestionTextAr(
  contentAr: DiscoveryModuleContentAr,
  itemId: string,
  text: string,
): DiscoveryModuleContentAr {
  const questions = { ...(contentAr.questions ?? {}) };
  questions[itemId] = { ...questions[itemId], text: text || undefined };
  return { ...contentAr, questions };
}

export function getForcedOptionLabelAr(
  contentAr: DiscoveryModuleContentAr,
  itemId: string,
  optionKey: "optionA" | "optionB",
): string {
  return contentAr.questions?.[itemId]?.[optionKey]?.label ?? "";
}

export function setForcedOptionLabelAr(
  contentAr: DiscoveryModuleContentAr,
  itemId: string,
  optionKey: "optionA" | "optionB",
  label: string,
): DiscoveryModuleContentAr {
  const questions = { ...(contentAr.questions ?? {}) };
  const prev = questions[itemId] ?? {};
  questions[itemId] = {
    ...prev,
    [optionKey]: { label: label || undefined },
  };
  return { ...contentAr, questions };
}

export function getScenarioOptionLabelAr(
  contentAr: DiscoveryModuleContentAr,
  itemId: string,
  optionIndex: number,
): string {
  return contentAr.questions?.[itemId]?.options?.[optionIndex]?.label ?? "";
}

export function setScenarioOptionLabelAr(
  contentAr: DiscoveryModuleContentAr,
  itemId: string,
  optionIndex: number,
  label: string,
): DiscoveryModuleContentAr {
  const questions = { ...(contentAr.questions ?? {}) };
  const prev = questions[itemId] ?? {};
  const options = [...(prev.options ?? [])];
  while (options.length <= optionIndex) options.push({ label: "" });
  options[optionIndex] = { label: label || undefined };
  questions[itemId] = { ...prev, options };
  return { ...contentAr, questions };
}

export function getProfileTitleAr(contentAr: DiscoveryModuleContentAr, profileId: string): string {
  return contentAr.profiles?.[profileId]?.title ?? "";
}

export function setProfileTitleAr(
  contentAr: DiscoveryModuleContentAr,
  profileId: string,
  title: string,
): DiscoveryModuleContentAr {
  const profiles = { ...(contentAr.profiles ?? {}) };
  profiles[profileId] = { ...profiles[profileId], title: title || undefined };
  return { ...contentAr, profiles };
}

export function getProfileListAr(
  contentAr: DiscoveryModuleContentAr,
  profileId: string,
  key: "majors_strong" | "majors_related" | "majors_stretch" | "careers",
): string[] {
  return contentAr.profiles?.[profileId]?.[key] ?? [];
}

export function setProfileListAr(
  contentAr: DiscoveryModuleContentAr,
  profileId: string,
  key: "majors_strong" | "majors_related" | "majors_stretch" | "careers",
  value: string[],
): DiscoveryModuleContentAr {
  const profiles = { ...(contentAr.profiles ?? {}) };
  profiles[profileId] = {
    ...profiles[profileId],
    [key]: value.length > 0 ? value : undefined,
  };
  return { ...contentAr, profiles };
}

export function getScaleLabelAr(
  contentAr: DiscoverySettingsContentAr,
  scaleId: string,
  value: number,
): string {
  return contentAr.scales?.[scaleId as keyof NonNullable<DiscoverySettingsContentAr["scales"]>]?.[
    String(value)
  ]?.label ?? "";
}

export function setScaleLabelAr(
  contentAr: DiscoverySettingsContentAr,
  scaleId: string,
  value: number,
  label: string,
): DiscoverySettingsContentAr {
  const scales = { ...(contentAr.scales ?? {}) };
  const scaleMap = { ...(scales[scaleId as keyof typeof scales] ?? {}) };
  scaleMap[String(value)] = { label: label || undefined };
  scales[scaleId as keyof typeof scales] = scaleMap;
  return { ...contentAr, scales };
}

export function getCombinedProfileTitleAr(
  contentAr: DiscoverySettingsContentAr,
  profileId: string,
): string {
  return contentAr.combined_profiles?.[profileId]?.title ?? "";
}

export function setCombinedProfileTitleAr(
  contentAr: DiscoverySettingsContentAr,
  profileId: string,
  title: string,
): DiscoverySettingsContentAr {
  const combined_profiles = { ...(contentAr.combined_profiles ?? {}) };
  combined_profiles[profileId] = { ...combined_profiles[profileId], title: title || undefined };
  return { ...contentAr, combined_profiles };
}

export function getCombinedProfileSummaryAr(
  contentAr: DiscoverySettingsContentAr,
  profileId: string,
): string {
  return contentAr.combined_profiles?.[profileId]?.summary ?? "";
}

export function setCombinedProfileSummaryAr(
  contentAr: DiscoverySettingsContentAr,
  profileId: string,
  summary: string,
): DiscoverySettingsContentAr {
  const combined_profiles = { ...(contentAr.combined_profiles ?? {}) };
  combined_profiles[profileId] = { ...combined_profiles[profileId], summary: summary || undefined };
  return { ...contentAr, combined_profiles };
}

export function translationStatusLabel(
  status: "not_translated" | "up_to_date" | "outdated",
): string {
  switch (status) {
    case "up_to_date":
      return "Up to date";
    case "outdated":
      return "Outdated";
    default:
      return "Not translated";
  }
}

export function translationStatusClass(
  status: "not_translated" | "up_to_date" | "outdated",
): string {
  switch (status) {
    case "up_to_date":
      return "border-[#b7e4c7] bg-[#d8f3dc] text-[#1B4332]";
    case "outdated":
      return "border-[#fde68a] bg-[#fef3c7] text-[#92400e]";
    default:
      return "border-[#e0deda] bg-[#f7f7f5] text-[#666]";
  }
}
