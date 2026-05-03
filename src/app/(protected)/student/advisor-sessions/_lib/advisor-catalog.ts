import type { Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";

export type AdvisorCatalogAdvisor = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  experienceYears: number | null;
  languages: string | null;
  description: string | null;
  bestFor: string | null;
  sessionFor: string | null;
  about: string | null;
  tags: string[];
  countryCodes: string[];
  nationalityCode: string;
  helps: string[];
  searchBlob: string;
};

function jsonToStringList(value: Json | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  if (typeof value === "object" && value !== null && "items" in value) {
    const items = (value as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string");
    }
  }
  return [];
}

export type AdvisorQueryRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  experience_years: number | null;
  languages: string | null;
  description: string | null;
  best_for: string | null;
  session_for: string | null;
  about: string | null;
  session_coverage: Json | null;
  questions: Json | null;
  nationality_country_code: string;
  advisor_tags_joint: { advisor_tags: { text: string } | null }[] | null;
  advisor_specializations_countries: { country_code: string }[] | null;
};

export function mapAdvisorRows(rows: AdvisorQueryRow[]): AdvisorCatalogAdvisor[] {
  return rows.map((r) => {
    const tags =
      r.advisor_tags_joint
        ?.map((j) => j.advisor_tags?.text)
        .filter((t): t is string => typeof t === "string" && t.length > 0) ?? [];
    const countryCodes =
      r.advisor_specializations_countries
        ?.map((c) => c.country_code?.toUpperCase())
        .filter((c): c is string => typeof c === "string" && c.length === 2) ?? [];
    const coverageHelps = jsonToStringList(r.session_coverage);
    const questionHelps = jsonToStringList(r.questions);
    const helps = coverageHelps.length > 0 ? coverageHelps : questionHelps;

    const countryNames = countryCodes
      .map((code) => getCountryNameByAlpha2(code) ?? code)
      .join(" ");
    const parts = [
      r.first_name,
      r.last_name,
      r.title ?? "",
      r.description ?? "",
      r.best_for ?? "",
      r.session_for ?? "",
      r.about ?? "",
      r.languages ?? "",
      tags.join(" "),
      countryNames,
      countryCodes.join(" "),
      ...helps,
    ];
    const searchBlob = parts.join(" ").toLowerCase();

    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      title: r.title,
      experienceYears: r.experience_years,
      languages: r.languages,
      description: r.description,
      bestFor: r.best_for,
      sessionFor: r.session_for,
      about: r.about,
      tags,
      countryCodes,
      nationalityCode: r.nationality_country_code.toUpperCase(),
      helps,
      searchBlob,
    };
  });
}
