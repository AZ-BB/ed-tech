import type { Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { livingCostLabel, tuitionCardLabel } from "@/lib/university-cost-display";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminUniversityDetailUniversity = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  countryCode: string;
  countryName: string;
  locationLabel: string;
  isPublic: boolean;
  isActive: boolean;
  isPriority: boolean;
  isScholarshipAvailable: boolean;
  description: string | null;
  ranking: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  acceptanceRate: number | null;
  intlStudents: number | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  admissionPageUrl: string | null;
  address: string | null;
  ieltsMinScore: number | null;
  toeflMinScore: number | null;
  satPolicy: string | null;
  documents: Json | null;
  documentsText: string;
  deadlineDate: string | null;
  method: string | null;
  applicationFee: number | null;
  intakes: string | null;
  tuitionPerYear: number | null;
  tuitionDisplay: string | null;
  estimatedLivingCostPerYear: number | null;
  livingDisplay: string | null;
  difficulty: string | null;
  typeLabel: string;
  tuitionLabel: string;
  livingCostLabel: string;
};

export type AdminUniversityDetailPayload = {
  university: AdminUniversityDetailUniversity;
  countries: { id: string; name: string }[];
  tabCounts: {
    shortlisted: number;
    favorites: number;
  };
};

function formatLocation(
  city: string,
  state: string | null,
  countryCode: string,
  countryName: string,
): string {
  const country = countryName || getCountryNameByAlpha2(countryCode) || countryCode;
  if (state?.trim()) return `${city}, ${state}, ${country}`;
  return `${city}, ${country}`;
}

function documentsToText(doc: Json | null): string {
  if (doc == null) return "";
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string").join("\n");
  }
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = (doc as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string").join("\n");
    }
  }
  return "";
}

async function countActivityStudents(
  universityId: string,
  type: "shortlist" | "save",
): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_activities")
    .select("student_id")
    .eq("uni_id", universityId)
    .eq("entity_type", "university")
    .eq("type", type)
    .not("uni_id", "is", null);

  if (error) {
    console.error(`[admin-university-detail] count ${type}`, error);
    return 0;
  }

  return new Set((data ?? []).map((row) => row.student_id)).size;
}

export async function fetchAdminUniversityDetail(
  universityId: string,
): Promise<AdminUniversityDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  const [{ data: university, error }, { data: countries }] = await Promise.all([
    supabase
      .from("universities")
      .select("*, countries(name)")
      .eq("id", universityId)
      .maybeSingle(),
    supabase.from("countries").select("id, name").order("name", { ascending: true }),
  ]);

  if (error || !university) {
    if (error) console.error("[admin-university-detail] fetch", error);
    return null;
  }

  const countryEmbed = university.countries as { name: string } | null;
  const countryName =
    countryEmbed?.name?.trim() ||
    getCountryNameByAlpha2(university.country_code) ||
    university.country_code;

  const [shortlisted, favorites] = await Promise.all([
    countActivityStudents(universityId, "shortlist"),
    countActivityStudents(universityId, "save"),
  ]);

  const detailUniversity: AdminUniversityDetailUniversity = {
    id: university.id,
    name: university.name.trim(),
    city: university.city.trim(),
    state: university.state?.trim() || null,
    countryCode: university.country_code,
    countryName,
    locationLabel: formatLocation(
      university.city,
      university.state,
      university.country_code,
      countryName,
    ),
    isPublic: university.is_public,
    isActive: university.is_active,
    isPriority: university.is_priority,
    isScholarshipAvailable: university.is_scholarship_available,
    description: university.description?.trim() || null,
    ranking: university.ranking,
    logoUrl: university.logo_url?.trim() || null,
    coverImageUrl: university.cover_image_url?.trim() || null,
    acceptanceRate: university.acceptance_rate,
    intlStudents: university.intl_students,
    websiteUrl: university.website_url?.trim() || null,
    email: university.email?.trim() || null,
    phone: university.phone?.trim() || null,
    admissionPageUrl: university.admission_page_url?.trim() || null,
    address: university.address?.trim() || null,
    ieltsMinScore: university.ielts_min_score,
    toeflMinScore: university.toefl_min_score,
    satPolicy: university.sat_policy?.trim() || null,
    documents: university.documents,
    documentsText: documentsToText(university.documents),
    deadlineDate: university.deadline_date,
    method: university.method?.trim() || null,
    applicationFee: university.application_fee,
    intakes: university.intakes?.trim() || null,
    tuitionPerYear: university.tuition_per_year,
    tuitionDisplay: university.tuition_display?.trim() || null,
    estimatedLivingCostPerYear: university.estimated_living_cost_per_year,
    livingDisplay: university.living_display?.trim() || null,
    difficulty: university.difficulty,
    typeLabel: university.is_public ? "Public" : "Private",
    tuitionLabel: tuitionCardLabel(university.tuition_display, university.tuition_per_year),
    livingCostLabel: livingCostLabel(
      university.living_display,
      university.estimated_living_cost_per_year,
    ),
  };

  return {
    university: detailUniversity,
    countries: (countries ?? []).map((c) => ({
      id: c.id,
      name: c.name.trim(),
    })),
    tabCounts: {
      shortlisted,
      favorites,
    },
  };
}
