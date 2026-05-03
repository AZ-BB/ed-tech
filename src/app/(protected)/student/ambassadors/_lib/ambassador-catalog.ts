import type { Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";

export type AmbassadorCatalogEntry = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  startYear: number | null;
  graduationYear: number | null;
  isCurrentStudent: boolean;
  destinationCode: string;
  nationalityCode: string;
  universityId: string | null;
  universityName: string | null;
  /** Resolved display name (embedded uni or `university_name`). */
  displayUniversity: string;
  major: string | null;
  about: string | null;
  helps: string[];
  tags: string[];
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

export type AmbassadorQueryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  start_year: number | null;
  graduation_year: number | null;
  is_current_student: boolean;
  destination_country_code: string;
  nationality_country_code: string;
  university_id: string | null;
  university_name: string | null;
  major: string | null;
  about: string | null;
  help_in: Json | null;
  ambassador_tags_joint: { ambassador_tags: { text: string } | null }[] | null;
  universities: { name: string } | null;
};

export function mapAmbassadorRows(rows: AmbassadorQueryRow[]): AmbassadorCatalogEntry[] {
  return rows.map((r) => {
    const tags =
      r.ambassador_tags_joint
        ?.map((j) => j.ambassador_tags?.text)
        .filter((t): t is string => typeof t === "string" && t.length > 0) ?? [];
    const helps = jsonToStringList(r.help_in);
    const uniFromJoin = r.universities?.name?.trim();
    const displayUniversity = (uniFromJoin && uniFromJoin.length > 0 ? uniFromJoin : r.university_name?.trim()) || "University TBD";
    const destName = getCountryNameByAlpha2(r.destination_country_code) ?? r.destination_country_code;
    const natName = getCountryNameByAlpha2(r.nationality_country_code) ?? r.nationality_country_code;
    const parts = [
      r.first_name,
      r.last_name,
      r.email,
      displayUniversity,
      r.university_name ?? "",
      destName,
      natName,
      r.destination_country_code,
      r.nationality_country_code,
      r.major ?? "",
      r.about ?? "",
      ...helps,
      ...tags,
    ];
    const searchBlob = parts.join(" ").toLowerCase();

    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      avatarUrl: r.avatar_url,
      startYear: r.start_year,
      graduationYear: r.graduation_year,
      isCurrentStudent: r.is_current_student,
      destinationCode: r.destination_country_code.toUpperCase(),
      nationalityCode: r.nationality_country_code.toUpperCase(),
      universityId: r.university_id,
      universityName: r.university_name,
      displayUniversity,
      major: r.major,
      about: r.about,
      helps,
      tags,
      searchBlob,
    };
  });
}
