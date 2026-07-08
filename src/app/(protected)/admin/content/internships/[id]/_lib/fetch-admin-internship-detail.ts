import type { Database } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { normalizeInternshipBulletList } from "@/lib/internship-bullet-list";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type InternshipSection = Database["public"]["Enums"]["internship_section"];
type InternshipFormat = Database["public"]["Enums"]["internship_format"];
type InternshipPayTier = Database["public"]["Enums"]["internship_pay_tier"];
type InternshipUrlStatus = Database["public"]["Enums"]["internship_url_status"];

const SECTION_LABELS: Record<InternshipSection, string> = {
  live: "Live",
  global: "Global",
  competition: "Competition",
  find: "Find",
};

const FORMAT_LABELS: Record<InternshipFormat, string> = {
  in_person: "In person",
  remote: "Remote",
  hybrid: "Hybrid",
  directory: "Directory",
};

const PAY_TIER_LABELS: Record<InternshipPayTier, string> = {
  paid: "Paid",
  free: "Free",
  unpaid: "Unpaid",
};

const URL_STATUS_LABELS: Record<InternshipUrlStatus, string> = {
  deep_link: "Deep link",
  hub_link: "Hub link",
  news_driven: "News driven",
  directory: "Directory",
  homepage: "Homepage",
};

export type AdminInternshipDetailInternship = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  section: InternshipSection;
  sectionLabel: string;
  countryCode: string;
  countryLabel: string;
  locationLabel: string;
  format: InternshipFormat;
  formatLabel: string;
  field: string;
  payTier: InternshipPayTier;
  payTierLabel: string;
  payLabel: string;
  duration: string;
  phone: string | null;
  nationalsOnly: boolean;
  officialUrl: string;
  urlStatus: InternshipUrlStatus;
  urlStatusLabel: string;
  needsReview: boolean;
  isActive: boolean;
  summary: string;
  whatYoullDo: string[];
  whatYoullDoText: string;
  whatYoullGain: string[];
  whatYoullGainText: string;
  eligibility: string;
  howToApply: string;
};

export type AdminInternshipDetailPayload = {
  internship: AdminInternshipDetailInternship;
  countries: { id: string; name: string }[];
  tabCounts: {
    saved: number;
  };
};

async function countSavedStudents(internshipId: string): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_activities")
    .select("student_id")
    .eq("internship_id", internshipId)
    .eq("entity_type", "internship")
    .eq("type", "save");

  if (error) {
    console.error("[admin-internship-detail] count saved", error);
    return 0;
  }

  return new Set((data ?? []).map((row) => row.student_id)).size;
}

export async function fetchAdminInternshipDetail(
  internshipId: string,
): Promise<AdminInternshipDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  const [{ data: internship, error }, { data: countries }] = await Promise.all([
    supabase
      .from("internships")
      .select(`*, countries(name)`)
      .eq("id", internshipId)
      .maybeSingle(),
    supabase
      .from("countries")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (error || !internship) {
    if (error) console.error("[admin-internship-detail] fetch", error);
    return null;
  }

  const countryEmbed = internship.countries as { name: string } | null;
  const countryLabel =
    countryEmbed?.name?.trim() ||
    getCountryNameByAlpha2(internship.country_code) ||
    internship.country_code;

  const saved = await countSavedStudents(internshipId);

  const detailInternship: AdminInternshipDetailInternship = {
    id: internship.id,
    slug: internship.slug.trim(),
    name: internship.name.trim(),
    provider: internship.provider.trim(),
    section: internship.section,
    sectionLabel: SECTION_LABELS[internship.section] ?? internship.section,
    countryCode: internship.country_code,
    countryLabel,
    locationLabel: internship.location_label.trim(),
    format: internship.format,
    formatLabel: FORMAT_LABELS[internship.format] ?? internship.format,
    field: internship.field.trim(),
    payTier: internship.pay_tier,
    payTierLabel: PAY_TIER_LABELS[internship.pay_tier] ?? internship.pay_tier,
    payLabel: internship.pay_label.trim(),
    duration: internship.duration.trim(),
    phone: internship.phone?.trim() || null,
    nationalsOnly: internship.nationals_only,
    officialUrl: internship.official_url.trim(),
    urlStatus: internship.url_status,
    urlStatusLabel:
      URL_STATUS_LABELS[internship.url_status] ?? internship.url_status,
    needsReview: internship.needs_review,
    isActive: internship.is_active,
    summary: internship.summary.trim(),
    whatYoullDo: normalizeInternshipBulletList(internship.what_youll_do),
    whatYoullDoText: normalizeInternshipBulletList(
      internship.what_youll_do,
    ).join("\n"),
    whatYoullGain: normalizeInternshipBulletList(internship.what_youll_gain),
    whatYoullGainText: normalizeInternshipBulletList(
      internship.what_youll_gain,
    ).join("\n"),
    eligibility: internship.eligibility.trim(),
    howToApply: internship.how_to_apply.trim(),
  };

  return {
    internship: detailInternship,
    countries: (countries ?? []).map((c) => ({
      id: c.id,
      name: c.name.trim(),
    })),
    tabCounts: {
      saved,
    },
  };
}
