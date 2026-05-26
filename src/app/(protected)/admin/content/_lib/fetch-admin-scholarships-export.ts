import type { Json } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminScholarshipExportRow = {
  name: string;
  nationality_country_code: string;
  destination_country_codes: string;
  type: string;
  description: string;
  target_students: string;
  level: string;
  fields: string;
  is_renewable: string;
  is_active: string;
  is_priority: string;
  coverage: string;
  competition: string;
  tuition_type: string;
  tuition: string;
  travel: string;
  living_stipend: string;
  other_benefits: string;
  city: string;
  academic_eligibility: string;
  ielts_min: string;
  toefl_min: string;
  sat_policy: string;
  doc_1: string;
  doc_2: string;
  doc_3: string;
  doc_4: string;
  doc_5: string;
  deadline_date: string;
  deadline: string;
  application_fee: string;
  intakes: string;
  method: string;
  other: string;
  tooltip: string;
  discovery_slug: string;
};

type DestinationRow = {
  country_code: string;
};

type ScholarshipExportQueryRow = {
  name: string;
  nationality_country_code: string;
  type: string | null;
  description: string | null;
  target_students: string | null;
  level: string | null;
  fields: Json | null;
  is_renewable: boolean;
  is_active: boolean;
  is_priority: boolean;
  coverage: string | null;
  competition: string | null;
  tuition_type: string | null;
  tuition: string | null;
  travel: string | null;
  living_stipend: string | null;
  other_benefits: string | null;
  city: string | null;
  academic_eligibility: string | null;
  ielts_min_score: number | null;
  toefl_min_score: number | null;
  sat_policy: string | null;
  documents: Json | null;
  deadline_date: string | null;
  deadline: string | null;
  application_fee: number | null;
  intakes: string | null;
  method: string | null;
  other: string | null;
  tooltip: string | null;
  discovery_slug: string | null;
  scholarship_destinations: DestinationRow[] | null;
};

function documentsToArray(doc: Json | null): string[] {
  if (doc == null) return [];
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function fieldsToCsv(fields: Json | null): string {
  if (fields == null) return "";
  if (Array.isArray(fields)) {
    return fields.filter((x): x is string => typeof x === "string").join(",");
  }
  return "";
}

function str(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function mapScholarshipToExportRow(row: ScholarshipExportQueryRow): AdminScholarshipExportRow {
  const docs = documentsToArray(row.documents);
  const destinationCodes =
    row.scholarship_destinations
      ?.map((d) => d.country_code?.trim())
      .filter((c): c is string => Boolean(c)) ?? [];

  return {
    name: row.name,
    nationality_country_code: row.nationality_country_code,
    destination_country_codes: destinationCodes.join(","),
    type: row.type?.trim() ?? "",
    description: row.description?.trim() ?? "",
    target_students: row.target_students?.trim() ?? "",
    level: row.level?.trim() ?? "",
    fields: fieldsToCsv(row.fields),
    is_renewable: row.is_renewable ? "true" : "false",
    is_active: row.is_active ? "true" : "false",
    is_priority: row.is_priority ? "true" : "false",
    coverage: row.coverage?.trim() ?? "",
    competition: row.competition?.trim() ?? "",
    tuition_type: row.tuition_type?.trim() ?? "",
    tuition: row.tuition?.trim() ?? "",
    travel: row.travel?.trim() ?? "",
    living_stipend: row.living_stipend?.trim() ?? "",
    other_benefits: row.other_benefits?.trim() ?? "",
    city: row.city?.trim() ?? "",
    academic_eligibility: row.academic_eligibility?.trim() ?? "",
    ielts_min: str(row.ielts_min_score),
    toefl_min: str(row.toefl_min_score),
    sat_policy: row.sat_policy?.trim() ?? "",
    doc_1: docs[0] ?? "",
    doc_2: docs[1] ?? "",
    doc_3: docs[2] ?? "",
    doc_4: docs[3] ?? "",
    doc_5: docs[4] ?? "",
    deadline_date: row.deadline_date?.trim() ?? "",
    deadline: row.deadline?.trim() ?? "",
    application_fee: str(row.application_fee),
    intakes: row.intakes?.trim() ?? "",
    method: row.method?.trim() ?? "",
    other: row.other?.trim() ?? "",
    tooltip: row.tooltip?.trim() ?? "",
    discovery_slug: row.discovery_slug?.trim() ?? "",
  };
}

export async function fetchAdminScholarshipsExport(): Promise<AdminScholarshipExportRow[]> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("scholarships")
    .select(
      `
      name,
      nationality_country_code,
      type,
      description,
      target_students,
      level,
      fields,
      is_renewable,
      is_active,
      is_priority,
      coverage,
      competition,
      tuition_type,
      tuition,
      travel,
      living_stipend,
      other_benefits,
      city,
      academic_eligibility,
      ielts_min_score,
      toefl_min_score,
      sat_policy,
      documents,
      deadline_date,
      deadline,
      application_fee,
      intakes,
      method,
      other,
      tooltip,
      discovery_slug,
      scholarship_destinations ( country_code )
      `,
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin-scholarships-export]", error);
    throw new Error("Could not load scholarships for export.");
  }

  return (data ?? []).map((row) =>
    mapScholarshipToExportRow(row as unknown as ScholarshipExportQueryRow),
  );
}
