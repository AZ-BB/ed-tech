import { flagFromCountryCode } from "@/lib/country-flag-emoji";
import { normalizeInternshipBulletList } from "@/lib/internship-bullet-list";
import type {
  Internship,
  InternshipFormat,
  InternshipPayTier,
  InternshipSection,
  InternshipUrlStatus,
} from "../_components/types";
import {
  internshipInitials,
  internshipLogoColor,
} from "./internship-logo-color";

export type InternshipDiscoveryRow = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  section: InternshipSection | string;
  country_code: string;
  location_label: string;
  format: InternshipFormat | string;
  field: string;
  pay_tier: InternshipPayTier | string;
  pay_label: string;
  duration: string;
  phone: string | null;
  nationals_only: boolean;
  official_url: string;
  url_status: InternshipUrlStatus | string;
  summary: string;
  what_youll_do: string[] | string | null;
  what_youll_gain: string[] | string | null;
  eligibility: string;
  how_to_apply: string;
  country_name?: string | null;
};

const SECTIONS = new Set(["live", "global", "competition", "find"]);
const FORMATS = new Set(["in_person", "remote", "hybrid", "directory"]);
const PAY_TIERS = new Set(["paid", "free", "unpaid"]);
const URL_STATUSES = new Set([
  "deep_link",
  "hub_link",
  "news_driven",
  "directory",
  "homepage",
]);

function asSection(v: string): InternshipSection {
  return SECTIONS.has(v) ? (v as InternshipSection) : "live";
}

function asFormat(v: string): InternshipFormat {
  return FORMATS.has(v) ? (v as InternshipFormat) : "in_person";
}

function asPayTier(v: string): InternshipPayTier {
  return PAY_TIERS.has(v) ? (v as InternshipPayTier) : "free";
}

function asUrlStatus(v: string): InternshipUrlStatus {
  return URL_STATUSES.has(v) ? (v as InternshipUrlStatus) : "homepage";
}

export function internshipRowToInternship(
  row: InternshipDiscoveryRow,
): Internship {
  const slug = row.slug?.trim() || row.id;
  const name = row.name?.trim() || "Internship";
  return {
    id: slug,
    slug,
    name,
    provider: row.provider?.trim() || "",
    section: asSection(String(row.section ?? "live")),
    countryCode: (row.country_code ?? "").toUpperCase(),
    locationLabel: row.location_label?.trim() || "",
    flag: flagFromCountryCode(row.country_code),
    format: asFormat(String(row.format ?? "in_person")),
    field: row.field?.trim() || "",
    payTier: asPayTier(String(row.pay_tier ?? "free")),
    payLabel: row.pay_label?.trim() || "",
    duration: row.duration?.trim() || "",
    phone: row.phone?.trim() || null,
    nationalsOnly: Boolean(row.nationals_only),
    officialUrl: row.official_url?.trim() || "",
    urlStatus: asUrlStatus(String(row.url_status ?? "homepage")),
    summary: row.summary?.trim() || "",
    whatYoullDo: normalizeInternshipBulletList(row.what_youll_do),
    whatYoullGain: normalizeInternshipBulletList(row.what_youll_gain),
    eligibility: row.eligibility?.trim() || "",
    howToApply: row.how_to_apply?.trim() || "",
    logoColor: internshipLogoColor(slug || name),
    initials: internshipInitials(name),
  };
}
