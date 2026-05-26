import type { Database, Json } from "@/database.types";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];

const TYPE_LABELS: Record<ScholarshipType, string> = {
  government: "Government",
  university: "University",
  corporate: "Corporate",
  foundation: "Foundation",
  other: "Other",
};

export type AdminScholarshipDetailScholarship = {
  id: string;
  name: string;
  nationalityCountryCode: string;
  nationalityLabel: string;
  destinationCountryCodes: string;
  destinationLabels: string;
  type: ScholarshipType | null;
  typeLabel: string;
  description: string | null;
  targetStudents: string | null;
  level: string | null;
  fieldsText: string;
  isRenewable: boolean;
  isActive: boolean;
  isPriority: boolean;
  coverage: string | null;
  competition: string | null;
  tuitionType: string | null;
  tuition: string | null;
  travel: string | null;
  livingStipend: string | null;
  otherBenefits: string | null;
  city: string | null;
  academicEligibility: string | null;
  ieltsMinScore: number | null;
  toeflMinScore: number | null;
  satPolicy: string | null;
  documents: Json | null;
  documentsText: string;
  deadlineDate: string | null;
  deadline: string | null;
  applicationFee: number | null;
  intakes: string | null;
  method: string | null;
  other: string | null;
  tooltip: string | null;
  discoverySlug: string | null;
};

export type AdminScholarshipDetailPayload = {
  scholarship: AdminScholarshipDetailScholarship;
  countries: { id: string; name: string }[];
  tabCounts: {
    saved: number;
    shortlisted: number;
  };
};

function documentsToText(doc: Json | null): string {
  if (doc == null) return "";
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string").join("\n");
  }
  return "";
}

function fieldsToText(fields: Json | null): string {
  if (fields == null) return "";
  if (Array.isArray(fields)) {
    return fields.filter((x): x is string => typeof x === "string").join(", ");
  }
  return "";
}

async function countActivityStudents(
  scholarshipId: string,
  type: "shortlist" | "save",
): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_activities")
    .select("student_id")
    .eq("scholarship_id", scholarshipId)
    .eq("entity_type", "scholarship")
    .eq("type", type);

  if (error) {
    console.error(`[admin-scholarship-detail] count ${type}`, error);
    return 0;
  }

  return new Set((data ?? []).map((row) => row.student_id)).size;
}

export async function fetchAdminScholarshipDetail(
  scholarshipId: string,
): Promise<AdminScholarshipDetailPayload | null> {
  const supabase = await createSupabaseSecretClient();

  const [{ data: scholarship, error }, { data: countries }] = await Promise.all([
    supabase
      .from("scholarships")
      .select(
        `*,
         countries(name),
         scholarship_destinations(country_code, countries(name))`,
      )
      .eq("id", scholarshipId)
      .maybeSingle(),
    supabase.from("countries").select("id, name").order("name", { ascending: true }),
  ]);

  if (error || !scholarship) {
    if (error) console.error("[admin-scholarship-detail] fetch", error);
    return null;
  }

  const countryEmbed = scholarship.countries as { name: string } | null;
  const nationalityLabel =
    countryEmbed?.name?.trim() ||
    getCountryNameByAlpha2(scholarship.nationality_country_code) ||
    scholarship.nationality_country_code;

  type DestRow = {
    country_code: string;
    countries: { name: string } | null;
  };

  const destinations = (scholarship.scholarship_destinations ?? []) as DestRow[];
  const destinationCodes = destinations
    .map((d) => d.country_code?.trim())
    .filter((c): c is string => Boolean(c));
  const destinationLabels = destinations
    .map((d) => d.countries?.name?.trim() || getCountryNameByAlpha2(d.country_code) || d.country_code)
    .filter(Boolean)
    .join(", ");

  const [saved, shortlisted] = await Promise.all([
    countActivityStudents(scholarshipId, "save"),
    countActivityStudents(scholarshipId, "shortlist"),
  ]);

  const detailScholarship: AdminScholarshipDetailScholarship = {
    id: scholarship.id,
    name: scholarship.name.trim(),
    nationalityCountryCode: scholarship.nationality_country_code,
    nationalityLabel,
    destinationCountryCodes: destinationCodes.join(","),
    destinationLabels: destinationLabels || "—",
    type: scholarship.type,
    typeLabel: scholarship.type ? (TYPE_LABELS[scholarship.type] ?? scholarship.type) : "—",
    description: scholarship.description?.trim() || null,
    targetStudents: scholarship.target_students?.trim() || null,
    level: scholarship.level?.trim() || null,
    fieldsText: fieldsToText(scholarship.fields),
    isRenewable: scholarship.is_renewable,
    isActive: scholarship.is_active,
    isPriority: scholarship.is_priority,
    coverage: scholarship.coverage?.trim() || null,
    competition: scholarship.competition,
    tuitionType: scholarship.tuition_type,
    tuition: scholarship.tuition?.trim() || null,
    travel: scholarship.travel?.trim() || null,
    livingStipend: scholarship.living_stipend?.trim() || null,
    otherBenefits: scholarship.other_benefits?.trim() || null,
    city: scholarship.city?.trim() || null,
    academicEligibility: scholarship.academic_eligibility?.trim() || null,
    ieltsMinScore: scholarship.ielts_min_score,
    toeflMinScore: scholarship.toefl_min_score,
    satPolicy: scholarship.sat_policy?.trim() || null,
    documents: scholarship.documents,
    documentsText: documentsToText(scholarship.documents),
    deadlineDate: scholarship.deadline_date,
    deadline: scholarship.deadline?.trim() || null,
    applicationFee: scholarship.application_fee,
    intakes: scholarship.intakes?.trim() || null,
    method: scholarship.method?.trim() || null,
    other: scholarship.other?.trim() || null,
    tooltip: scholarship.tooltip?.trim() || null,
    discoverySlug: scholarship.discovery_slug?.trim() || null,
  };

  return {
    scholarship: detailScholarship,
    countries: (countries ?? []).map((c) => ({
      id: c.id,
      name: c.name.trim(),
    })),
    tabCounts: {
      saved,
      shortlisted,
    },
  };
}
