import { translateDiscoveryScaleLabelToArabic } from "@/lib/translation/translate-discovery-scale-labels";
import { localizeDiscoveryCategoryName } from "@/lib/translation/translate-discovery-category-labels";
import type { Locale } from "@/lib/i18n/config";
import type { StudentEventCard } from "@/app/(protected)/student/events/_lib/get-event-discovery-page";
import type { Internship } from "@/app/(protected)/student/internships/_components/types";
import type { Scholarship } from "@/app/(protected)/student/scholarships/_components/types";
import type { StudentWebinarCard } from "@/app/(protected)/student/webinars/_lib/fetch-student-webinars";
import {
  parseDiscoveryModuleContentAr,
  parseDiscoverySettingsContentAr,
  type DiscoveryModuleContentAr,
  type DiscoverySettingsContentAr,
} from "@/lib/discovery-translatable-fields";
import type {
  CombinedProfileConfig,
  DiscoveryModuleProfile,
  DiscoveryQuestion,
  DiscoveryScales,
  ModuleResult,
} from "@/types/discovery";
import {
  joinSemicolonList,
  parseEventContentAr,
  type EventContentAr,
} from "@/lib/event-translatable-fields";
import {
  formatEventTimeLabel,
  formatRegionFocusLabel,
} from "@/lib/event-type-styles";
import {
  parseWebinarContentAr,
  type WebinarContentAr,
} from "@/lib/webinar-translatable-fields";
import { getLocalizedCountryName } from "@/lib/countries";
import {
  parseInternshipContentAr,
  type InternshipContentAr,
} from "@/lib/internship-translatable-fields";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import {
  parseScholarshipContentAr,
  type ScholarshipContentAr,
} from "@/lib/scholarship-translatable-fields";
import {
  parseUniversityContentAr,
  type UniversityContentAr,
  type UniversitySourceRow,
} from "@/lib/university-translatable-fields";
import type { DiscoveryProgram } from "@/app/(protected)/student/programs/_lib/program-row-to-program";
import type { ProgramUniversityOffering } from "@/app/(protected)/student/programs/_lib/get-program-university-offerings";
import {
  parseProgramDiscoveryContentAr,
  type ProgramDiscoveryContentAr,
} from "@/lib/program-discovery-translatable-fields";
import {
  parseUniversityProgramContentAr,
  type UniversityProgramContentAr,
} from "@/lib/university-program-translatable-fields";
import type { Json } from "@/database.types";
import {
  livingCostLabel,
  tuitionCardLabel,
  tuitionDetailLabel,
  tuitionSentenceLabel,
} from "@/lib/university-cost-display";
export function pickLocalizedField(
  locale: Locale,
  enValue: string | null | undefined,
  arValue: string | null | undefined,
): string {
  const en = enValue?.trim() ?? "";
  const ar = arValue?.trim() ?? "";
  if (locale === "ar" && ar) return ar;
  return en;
}

export function pickLocalizedDocuments(
  locale: Locale,
  enDocs: string[],
  arDocs: string[] | undefined,
): string[] {
  if (locale === "ar" && arDocs && arDocs.length > 0) return arDocs;
  return enDocs;
}

export function hasArabicUniversityContent(contentAr: UniversityContentAr | null | undefined): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

export type LocalizedUniversityDisplay = {
  name: string;
  city: string;
  countryName: string;
  description: string | null;
  tuitionDisplay: string;
  tuitionSentence: string;
  livingFormatted: string;
  satPolicy: string | null;
  methodFormatted: string;
  intakesFormatted: string;
  documents: string[];
  scholarshipNote: string | null;
  useRtlContent: boolean;
};

export function applyUniversityLocalization(
  locale: Locale,
  row: UniversitySourceRow,
  contentArRaw: Json | null | undefined,
  enDocuments: string[],
  enScholarshipNote: string | null,
): LocalizedUniversityDisplay {
  const contentAr = parseUniversityContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicUniversityContent(contentAr);

  const enTuitionDisplay = tuitionDetailLabel(row.tuition_display, row.tuition_per_year);
  const enTuitionSentence = tuitionSentenceLabel(row.tuition_display, row.tuition_per_year);
  const enLiving = livingCostLabel(row.living_display, row.estimated_living_cost_per_year);

  const enCountryName = row.country_code
    ? getLocalizedCountryName(row.country_code, "en")
    : "";
  const arCountryName = row.country_code
    ? contentAr.country_name ?? getLocalizedCountryName(row.country_code, "ar")
    : "";

  return {
    name: pickLocalizedField(locale, row.name, contentAr.name),
    city: pickLocalizedField(locale, row.city, contentAr.city) || row.city?.trim() || "",
    countryName: pickLocalizedField(locale, enCountryName, arCountryName) || enCountryName,
    description: pickLocalizedField(locale, row.description, contentAr.description) || null,
    tuitionDisplay: pickLocalizedField(
      locale,
      enTuitionDisplay,
      contentAr.tuition_display ?? contentAr.tuition_sentence,
    ),
    tuitionSentence: pickLocalizedField(
      locale,
      enTuitionSentence,
      contentAr.tuition_sentence ?? contentAr.tuition_display,
    ),
    livingFormatted: pickLocalizedField(
      locale,
      enLiving,
      contentAr.living_display ?? contentAr.living_sentence,
    ),
    satPolicy:
      pickLocalizedField(locale, row.sat_policy, contentAr.sat_policy) || null,
    methodFormatted: pickLocalizedField(locale, row.method, contentAr.method) || "—",
    intakesFormatted:
      pickLocalizedField(
        locale,
        row.intakes,
        contentAr.intakes ?? translateIntakesToArabic(row.intakes),
      ) || "—",
    documents: pickLocalizedDocuments(locale, enDocuments, contentAr.documents),
    scholarshipNote:
      pickLocalizedField(locale, enScholarshipNote, contentAr.scholarship_note) || null,
    useRtlContent,
  };
}

export function localizedTuitionCardLabel(
  locale: Locale,
  contentArRaw: Json | null | undefined,
  tuitionDisplay: string | null,
  tuitionPerYear: number | null,
): string {
  const contentAr = parseUniversityContentAr(contentArRaw);
  const en = tuitionCardLabel(tuitionDisplay, tuitionPerYear);
  return pickLocalizedField(
    locale,
    en,
    contentAr.tuition_display ?? contentAr.tuition_sentence,
  );
}

export function hasArabicScholarshipContent(
  contentAr: ScholarshipContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

export function pickLocalizedStringList(
  locale: Locale,
  enList: string[],
  arList: string[] | undefined,
): string[] {
  if (locale === "ar" && arList && arList.length > 0) return arList;
  return enList;
}

export function applyScholarshipLocalization(
  locale: Locale,
  scholarship: Scholarship,
  contentArRaw: Json | null | undefined,
): Scholarship {
  const contentAr = parseScholarshipContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicScholarshipContent(contentAr);

  return {
    ...scholarship,
    name: pickLocalizedField(locale, scholarship.name, contentAr.name),
    provider: pickLocalizedField(locale, scholarship.provider, contentAr.provider),
    country: pickLocalizedField(locale, scholarship.country, contentAr.country),
    type: pickLocalizedField(locale, scholarship.type, contentAr.type),
    shortSummary: pickLocalizedField(locale, scholarship.shortSummary, contentAr.shortSummary),
    eligSummary: pickLocalizedField(locale, scholarship.eligSummary, contentAr.eligSummary),
    degreeLevels: pickLocalizedField(locale, scholarship.degreeLevels, contentAr.degreeLevels),
    fieldsOfStudy: pickLocalizedField(locale, scholarship.fieldsOfStudy, contentAr.fieldsOfStudy),
    academicElig: pickLocalizedField(locale, scholarship.academicElig, contentAr.academicElig),
    englishReq: pickLocalizedField(locale, scholarship.englishReq, contentAr.englishReq),
    otherElig: pickLocalizedField(locale, scholarship.otherElig, contentAr.otherElig),
    applicationMethod: pickLocalizedField(
      locale,
      scholarship.applicationMethod,
      contentAr.applicationMethod,
    ),
    coverageLabel: pickLocalizedField(
      locale,
      scholarship.coverageLabel,
      contentAr.coverageLabel,
    ),
    tooltip: pickLocalizedField(locale, scholarship.tooltip, contentAr.tooltip),
    competition: pickLocalizedField(locale, scholarship.competition, contentAr.competition),
    renewable: pickLocalizedField(locale, scholarship.renewable, contentAr.renewable),
    deadline: pickLocalizedField(locale, scholarship.deadline, contentAr.deadline),
    linkNotes: pickLocalizedField(locale, scholarship.linkNotes, contentAr.linkNotes),
    applicationWebsiteName: pickLocalizedField(
      locale,
      scholarship.applicationWebsiteName,
      contentAr.applicationWebsiteName,
    ),
    satPolicy:
      pickLocalizedField(locale, scholarship.satPolicy, contentAr.sat_policy) ||
      scholarship.satPolicy,
    requiredDocs: pickLocalizedStringList(
      locale,
      scholarship.requiredDocs,
      contentAr.requiredDocs,
    ),
    destinations: pickLocalizedStringList(
      locale,
      scholarship.destinations,
      contentAr.destinations,
    ),
    coverageDetails: {
      tuition: pickLocalizedField(
        locale,
        scholarship.coverageDetails.tuition,
        contentAr.coverage_tuition,
      ),
      stipend: pickLocalizedField(
        locale,
        scholarship.coverageDetails.stipend,
        contentAr.coverage_stipend,
      ),
      travel: pickLocalizedField(
        locale,
        scholarship.coverageDetails.travel,
        contentAr.coverage_travel,
      ),
      other: pickLocalizedField(
        locale,
        scholarship.coverageDetails.other,
        contentAr.coverage_other,
      ),
    },
    useRtlContent,
  };
}

export function hasArabicInternshipContent(
  contentAr: InternshipContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

export function applyInternshipLocalization(
  locale: Locale,
  internship: Internship,
  contentArRaw: Json | null | undefined,
): Internship {
  const contentAr = parseInternshipContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicInternshipContent(contentAr);

  return {
    ...internship,
    name: pickLocalizedField(locale, internship.name, contentAr.name),
    provider: pickLocalizedField(locale, internship.provider, contentAr.provider),
    locationLabel: pickLocalizedField(
      locale,
      internship.locationLabel,
      contentAr.locationLabel,
    ),
    field: pickLocalizedField(locale, internship.field, contentAr.field),
    payLabel: pickLocalizedField(locale, internship.payLabel, contentAr.payLabel),
    duration: pickLocalizedField(locale, internship.duration, contentAr.duration),
    summary: pickLocalizedField(locale, internship.summary, contentAr.summary),
    eligibility: pickLocalizedField(locale, internship.eligibility, contentAr.eligibility),
    howToApply: pickLocalizedField(locale, internship.howToApply, contentAr.howToApply),
    whatYoullDo: pickLocalizedStringList(
      locale,
      internship.whatYoullDo,
      contentAr.whatYoullDo,
    ),
    whatYoullGain: pickLocalizedStringList(
      locale,
      internship.whatYoullGain,
      contentAr.whatYoullGain,
    ),
    useRtlContent,
  };
}

export function hasArabicEventContent(
  contentAr: EventContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

function pickLocalizedSemicolonString(
  locale: Locale,
  enValue: string | null | undefined,
  arList: string[] | undefined,
): string | null {
  const en = enValue?.trim() ?? "";
  if (locale === "ar" && arList && arList.length > 0) {
    return joinSemicolonList(arList);
  }
  return en || null;
}

export function applyEventLocalization(
  locale: Locale,
  event: StudentEventCard,
  contentArRaw: Json | null | undefined,
): StudentEventCard {
  const contentAr = parseEventContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicEventContent(contentAr);

  const enRegionFocus = formatRegionFocusLabel(event.regionFocus);
  const enTimeDisplay = formatEventTimeLabel(
    event.startTime,
    event.endTime,
    event.timezone,
  );

  return {
    ...event,
    name: pickLocalizedField(locale, event.name, contentAr.eventName),
    eventType: pickLocalizedField(locale, event.eventType, contentAr.eventType),
    organizer: pickLocalizedField(locale, event.organizer, contentAr.organizer),
    shortDescription: pickLocalizedField(
      locale,
      event.shortDescription,
      contentAr.shortDescription,
    ),
    country: pickLocalizedField(locale, event.country, contentAr.country) || event.country,
    city: pickLocalizedField(locale, event.city, contentAr.city) || event.city,
    venue: pickLocalizedField(locale, event.venue, contentAr.venue) || event.venue,
    recommendedTag:
      pickLocalizedField(locale, event.recommendedTag, contentAr.recommendedTag) ||
      event.recommendedTag,
    fullOverview:
      pickLocalizedField(locale, event.fullOverview, contentAr.fullOverview) ||
      event.fullOverview,
    targetAudience:
      pickLocalizedSemicolonString(locale, event.targetAudience, contentAr.targetAudience) ??
      event.targetAudience,
    whyAttend:
      pickLocalizedSemicolonString(locale, event.whyAttend, contentAr.whyAttend) ??
      event.whyAttend,
    prepSteps:
      pickLocalizedSemicolonString(locale, event.prepSteps, contentAr.prepSteps) ??
      event.prepSteps,
    regionFocus:
      pickLocalizedField(locale, enRegionFocus, contentAr.regionFocus) || enRegionFocus,
    timeDisplay:
      pickLocalizedField(locale, enTimeDisplay, contentAr.timeDisplay) || enTimeDisplay,
    universitiesAttending:
      pickLocalizedSemicolonString(
        locale,
        event.universitiesAttending,
        contentAr.universitiesAttending,
      ) ?? event.universitiesAttending,
    useRtlContent,
  };
}

export function hasArabicWebinarContent(
  contentAr: WebinarContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

export function applyWebinarLocalization(
  locale: Locale,
  webinar: StudentWebinarCard,
  contentArRaw: Json | null | undefined,
): StudentWebinarCard {
  const contentAr = parseWebinarContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicWebinarContent(contentAr);

  return {
    ...webinar,
    title: pickLocalizedField(locale, webinar.title, contentAr.title),
    description: pickLocalizedField(locale, webinar.description, contentAr.description),
    format: pickLocalizedField(locale, webinar.format, contentAr.format),
    tags: pickLocalizedStringList(locale, webinar.tags, contentAr.tags),
    agenda: pickLocalizedStringList(locale, webinar.agenda, contentAr.agenda),
    speakerName: pickLocalizedField(locale, webinar.speakerName, contentAr.speakerName),
    speakerTitle: pickLocalizedField(locale, webinar.speakerTitle, contentAr.speakerTitle),
    speakerBio: pickLocalizedField(locale, webinar.speakerBio, contentAr.speakerBio),
    useRtlContent,
  };
}

export function hasArabicDiscoveryModuleContent(
  contentAr: DiscoveryModuleContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Boolean(
    contentAr.title ||
      contentAr.subtitle ||
      contentAr.description ||
      (contentAr.categories && contentAr.categories.length > 0) ||
      (contentAr.questions && Object.keys(contentAr.questions).length > 0) ||
      (contentAr.profiles && Object.keys(contentAr.profiles).length > 0),
  );
}

export function hasArabicDiscoverySettingsContent(
  contentAr: DiscoverySettingsContentAr | null | undefined,
): boolean {
  if (!contentAr) return false;
  return Boolean(
    (contentAr.scales && Object.keys(contentAr.scales).length > 0) ||
      (contentAr.combined_profiles && Object.keys(contentAr.combined_profiles).length > 0),
  );
}

function localizeDiscoveryQuestion(
  locale: Locale,
  question: DiscoveryQuestion,
  contentAr: DiscoveryModuleContentAr,
): DiscoveryQuestion {
  const arQ = contentAr.questions?.[question.item_id];
  if (locale !== "ar" || !arQ) return question;

  const text = pickLocalizedField(locale, question.text, arQ.text);

  if (question.response_type === "forced_choice") {
    return {
      ...question,
      text,
      optionA: {
        ...question.optionA,
        label: pickLocalizedField(locale, question.optionA.label, arQ.optionA?.label),
      },
      optionB: {
        ...question.optionB,
        label: pickLocalizedField(locale, question.optionB.label, arQ.optionB?.label),
      },
    };
  }

  if (question.response_type === "scenario_select") {
    return {
      ...question,
      text,
      options: question.options.map((opt, index) => ({
        ...opt,
        label: pickLocalizedField(locale, opt.label, arQ.options?.[index]?.label),
      })),
    };
  }

  return { ...question, text };
}

function localizeDiscoveryProfile(
  locale: Locale,
  profile: DiscoveryModuleProfile,
  contentAr: DiscoveryModuleContentAr,
): DiscoveryModuleProfile {
  const arP = contentAr.profiles?.[profile.profile_id];
  if (locale !== "ar" || !arP) return profile;

  return {
    ...profile,
    title: pickLocalizedField(locale, profile.title, arP.title),
    majors_strong: pickLocalizedStringList(locale, profile.majors_strong, arP.majors_strong),
    majors_related: pickLocalizedStringList(locale, profile.majors_related, arP.majors_related),
    majors_stretch: pickLocalizedStringList(locale, profile.majors_stretch, arP.majors_stretch),
    careers: pickLocalizedStringList(locale, profile.careers, arP.careers),
  };
}

export type LocalizableDiscoveryModule = {
  title: string;
  subtitle: string | null;
  description: string | null;
  categories: string[];
  questions: DiscoveryQuestion[];
  profiles: DiscoveryModuleProfile[];
};

export function applyDiscoveryModuleLocalization<T extends LocalizableDiscoveryModule>(
  locale: Locale,
  module: T,
  contentArRaw: Json | null | undefined,
): T & { useRtlContent: boolean } {
  const contentAr = parseDiscoveryModuleContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicDiscoveryModuleContent(contentAr);

  if (!useRtlContent) {
    if (locale === "ar") {
      return {
        ...module,
        categories: module.categories.map((cat) =>
          localizeDiscoveryCategoryName(locale, cat, {
            enCategories: module.categories,
            arCategories: contentAr.categories,
          }),
        ),
        useRtlContent: false,
      };
    }
    return { ...module, useRtlContent: false };
  }

  return {
    ...module,
    title: pickLocalizedField(locale, module.title, contentAr.title),
    subtitle:
      pickLocalizedField(locale, module.subtitle ?? "", contentAr.subtitle ?? "") || null,
    description:
      pickLocalizedField(locale, module.description ?? "", contentAr.description ?? "") || null,
    categories: module.categories.map((cat) =>
      localizeDiscoveryCategoryName(locale, cat, {
        enCategories: module.categories,
        arCategories: contentAr.categories,
      }),
    ),
    questions: module.questions.map((q) => localizeDiscoveryQuestion(locale, q, contentAr)),
    profiles: module.profiles.map((p) => localizeDiscoveryProfile(locale, p, contentAr)),
    useRtlContent,
  };
}

export function applyDiscoveryScalesLocalization(
  locale: Locale,
  scales: DiscoveryScales,
  contentArRaw: Json | null | undefined,
): DiscoveryScales {
  if (locale !== "ar") return scales;

  const contentAr = parseDiscoverySettingsContentAr(contentArRaw);
  const next: DiscoveryScales = { ...scales };

  for (const [scaleId, options] of Object.entries(scales)) {
    if (!Array.isArray(options)) continue;
    const arScale = contentAr.scales?.[scaleId as keyof typeof contentAr.scales];
    next[scaleId as keyof DiscoveryScales] = options.map((opt) => {
      const staticAr = translateDiscoveryScaleLabelToArabic(scaleId, opt.value, opt.label);
      const dbAr = arScale?.[String(opt.value)]?.label;
      return {
        ...opt,
        label: pickLocalizedField(locale, opt.label, dbAr ?? staticAr),
      };
    });
  }

  return next;
}

export function applyDiscoveryCombinedProfileLocalization(
  locale: Locale,
  profile: CombinedProfileConfig,
  contentArRaw: Json | null | undefined,
): CombinedProfileConfig {
  const contentAr = parseDiscoverySettingsContentAr(contentArRaw);
  const arProfile = contentAr.combined_profiles?.[profile.profile_id];
  if (locale !== "ar" || !arProfile) return profile;

  return {
    ...profile,
    title: pickLocalizedField(locale, profile.title, arProfile.title),
    summary: pickLocalizedField(locale, profile.summary, arProfile.summary),
  };
}

export function localizeModuleResult(
  locale: Locale,
  result: ModuleResult,
  contentArRaw: Json | null | undefined,
  enCategories?: string[],
): ModuleResult {
  const contentAr = parseDiscoveryModuleContentAr(contentArRaw);

  function localizeCategoryName(category: string): string {
    return localizeDiscoveryCategoryName(locale, category, {
      enCategories,
      arCategories: contentAr.categories,
    });
  }

  function localizeCategoryScores<T extends { category: string }>(scores: T[]): T[] {
    if (locale !== "ar") return scores;
    return scores.map((cat) => ({
      ...cat,
      category: localizeCategoryName(cat.category),
    }));
  }

  const hasProfileAr = locale === "ar" && hasArabicDiscoveryModuleContent(contentAr);

  return {
    ...result,
    profile: hasProfileAr
      ? localizeDiscoveryProfile(locale, result.profile, contentAr)
      : result.profile,
    topProfiles: hasProfileAr
      ? result.topProfiles.map((p) => localizeDiscoveryProfile(locale, p, contentAr))
      : result.topProfiles,
    topCategories: localizeCategoryScores(result.topCategories),
    allScores: localizeCategoryScores(result.allScores),
  };
}

function hasArabicProgramDiscoveryContent(
  contentAr: ProgramDiscoveryContentAr,
): boolean {
  return Object.entries(contentAr).some(([, value]) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

function pickLocalizedJsonSection<T>(
  locale: Locale,
  enSection: T[],
  arSection: T[] | undefined,
): T[] {
  if (locale === "ar" && arSection && arSection.length > 0) return arSection;
  return enSection;
}

export function applyProgramDiscoveryLocalization(
  locale: Locale,
  program: DiscoveryProgram,
  contentArRaw: Json | null | undefined,
): DiscoveryProgram {
  const contentAr = parseProgramDiscoveryContentAr(contentArRaw);
  if (locale !== "ar" || !hasArabicProgramDiscoveryContent(contentAr)) {
    return program;
  }

  return {
    ...program,
    title: pickLocalizedField(locale, program.title, contentAr.title),
    category: pickLocalizedField(locale, program.category, contentAr.category),
    shortDescription: pickLocalizedField(
      locale,
      program.shortDescription,
      contentAr.short_description,
    ),
    description: pickLocalizedField(locale, program.description, contentAr.description),
    tags: pickLocalizedStringList(locale, program.tags, contentAr.tags),
    salaryPotential: pickLocalizedField(
      locale,
      program.salaryPotential,
      contentAr.salary_potential,
    ),
    demandLevel: pickLocalizedField(locale, program.demandLevel, contentAr.demand_level),
    mathIntensity: pickLocalizedField(locale, program.mathIntensity, contentAr.math_intensity),
    aiResilience: pickLocalizedField(locale, program.aiResilience, contentAr.ai_resilience),
    careerPaths: pickLocalizedJsonSection(
      locale,
      program.careerPaths,
      contentAr.career_paths,
    ),
    coreSkills: pickLocalizedJsonSection(locale, program.coreSkills, contentAr.core_skills),
    studyPlan: pickLocalizedJsonSection(locale, program.studyPlan, contentAr.study_plan),
    dayInLife: pickLocalizedJsonSection(locale, program.dayInLife, contentAr.day_in_life),
    salaryRegions: pickLocalizedJsonSection(
      locale,
      program.salaryRegions,
      contentAr.salary_regions,
    ),
    careerExamples: pickLocalizedJsonSection(
      locale,
      program.careerExamples,
      contentAr.career_examples,
    ),
    employers: pickLocalizedJsonSection(locale, program.employers, contentAr.employers),
    videos: program.videos.map((video, index) => {
      const arVideo = contentAr.videos?.[index];
      if (!arVideo) return video;
      return {
        ...video,
        category: pickLocalizedField(locale, video.category, arVideo.category),
        title: pickLocalizedField(locale, video.title, arVideo.title),
        channel: pickLocalizedField(locale, video.channel, arVideo.channel),
      };
    }),
  };
}

export function applyUniversityProgramOfferingLocalization(
  locale: Locale,
  offering: ProgramUniversityOffering,
  contentArRaw: Json | null | undefined,
): ProgramUniversityOffering {
  const contentAr = parseUniversityProgramContentAr(contentArRaw);
  if (locale !== "ar") return offering;

  return {
    ...offering,
    rankingNote: pickLocalizedField(locale, offering.rankingNote, contentAr.ranking_note),
    tuitionNote: pickLocalizedField(locale, offering.tuitionNote, contentAr.tuition_note),
    shortDescription: pickLocalizedField(
      locale,
      offering.shortDescription,
      contentAr.short_description,
    ),
    programSchoolNote: pickLocalizedField(
      locale,
      offering.programSchoolNote,
      contentAr.program_school_note,
    ),
  };
}

export function applyRelatedProgramSummaryLocalization(
  locale: Locale,
  summary: { slug: string; title: string; category: string },
  contentArRaw: Json | null | undefined,
): { slug: string; title: string; category: string } {
  const contentAr = parseProgramDiscoveryContentAr(contentArRaw);
  if (locale !== "ar" || !hasArabicProgramDiscoveryContent(contentAr)) {
    return summary;
  }

  return {
    slug: summary.slug,
    title: pickLocalizedField(locale, summary.title, contentAr.title),
    category: pickLocalizedField(locale, summary.category, contentAr.category),
  };
}
