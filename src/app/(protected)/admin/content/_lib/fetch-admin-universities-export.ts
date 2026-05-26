import type { Json } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminUniversityExportRow = {
  name: string;
  country: string;
  country_code: string;
  city: string;
  state_region: string;
  type: string;
  description: string;
  ranking: string;
  logo_url: string;
  acceptance_rate: string;
  intl_students_pct: string;
  website: string;
  email: string;
  phone: string;
  admissions_url: string;
  address: string;
  ielts_min: string;
  toefl_min: string;
  sat_policy: string;
  doc_1: string;
  doc_2: string;
  doc_3: string;
  doc_4: string;
  doc_5: string;
  deadline_primary: string;
  is_priority: string;
  application_method: string;
  application_fee: string;
  intakes: string;
  tuition_amount: string;
  tuition_display: string;
  living_cost_annual: string;
  living_display: string;
  scholarship_note: string;
  difficulty: string;
  is_active: string;
  prog1_name: string;
  prog1_items: string;
  prog2_name: string;
  prog2_items: string;
  prog3_name: string;
  prog3_items: string;
  prog4_name: string;
  prog4_items: string;
};

const tuitionFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type UnivMajorProgramRow = {
  programs: { name: string } | null;
};

type UnivMajorRow = {
  majors: { name: string } | null;
  university_major_programs: UnivMajorProgramRow[] | null;
};

type UniversityExportQueryRow = {
  name: string;
  city: string;
  state: string | null;
  country_code: string;
  is_public: boolean;
  is_active: boolean;
  is_priority: boolean;
  is_scholarship_available: boolean;
  description: string | null;
  ranking: number | null;
  logo_url: string | null;
  acceptance_rate: number | null;
  intl_students: number | null;
  website_url: string | null;
  email: string | null;
  phone: string | null;
  admission_page_url: string | null;
  address: string | null;
  ielts_min_score: number | null;
  toefl_min_score: number | null;
  sat_policy: string | null;
  documents: Json | null;
  deadline_date: string | null;
  method: string | null;
  application_fee: number | null;
  intakes: string | null;
  tuition_per_year: number | null;
  estimated_living_cost_per_year: number | null;
  difficulty: string | null;
  countries: { name: string } | null;
  university_majors: UnivMajorRow[] | null;
};

type MajorBlock = {
  majorName: string;
  programs: string[];
};

function buildMajorBlocks(rows: UnivMajorRow[] | null): MajorBlock[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => {
      const majorName = row.majors?.name?.trim() || "";
      const programs =
        row.university_major_programs
          ?.map((p) => p.programs?.name?.trim())
          .filter((n): n is string => Boolean(n)) ?? [];
      return { majorName, programs };
    })
    .filter((b) => b.majorName.length > 0)
    .sort((a, b) => a.majorName.localeCompare(b.majorName));
}

function documentsToArray(doc: Json | null): string[] {
  if (doc == null) return [];
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string");
  }
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = (doc as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string");
    }
  }
  return [];
}

function formatTuitionDisplay(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return `${tuitionFormatter.format(amount)} per year`;
}

function formatLivingDisplay(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return `${tuitionFormatter.format(amount)} per year`;
}

function str(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function mapUniversityToExportRow(row: UniversityExportQueryRow): AdminUniversityExportRow {
  const blocks = buildMajorBlocks(row.university_majors).slice(0, 4);
  const docs = documentsToArray(row.documents);

  const progFields: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    const block = blocks[i];
    progFields[`prog${n}_name`] = block?.majorName ?? "";
    progFields[`prog${n}_items`] = block?.programs.join(",") ?? "";
  }

  return {
    name: row.name,
    country: row.countries?.name?.trim() ?? "",
    country_code: row.country_code,
    city: row.city,
    state_region: row.state?.trim() ?? "",
    type: row.is_public ? "public" : "private",
    description: row.description?.trim() ?? "",
    ranking: str(row.ranking),
    logo_url: row.logo_url?.trim() ?? "",
    acceptance_rate: str(row.acceptance_rate),
    intl_students_pct: str(row.intl_students),
    website: row.website_url?.trim() ?? "",
    email: row.email?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    admissions_url: row.admission_page_url?.trim() ?? "",
    address: row.address?.trim() ?? "",
    ielts_min: str(row.ielts_min_score),
    toefl_min: str(row.toefl_min_score),
    sat_policy: row.sat_policy?.trim() ?? "",
    doc_1: docs[0] ?? "",
    doc_2: docs[1] ?? "",
    doc_3: docs[2] ?? "",
    doc_4: docs[3] ?? "",
    doc_5: docs[4] ?? "",
    deadline_primary: row.deadline_date?.trim() ?? "",
    is_priority: row.is_priority ? "true" : "false",
    application_method: row.method?.trim() ?? "",
    application_fee: str(row.application_fee),
    intakes: row.intakes?.trim() ?? "",
    tuition_amount: str(row.tuition_per_year),
    tuition_display: formatTuitionDisplay(row.tuition_per_year),
    living_cost_annual: str(row.estimated_living_cost_per_year),
    living_display: formatLivingDisplay(row.estimated_living_cost_per_year),
    scholarship_note: row.is_scholarship_available ? "Scholarships available" : "",
    difficulty: row.difficulty?.trim() ?? "",
    is_active: row.is_active ? "true" : "false",
    prog1_name: progFields.prog1_name ?? "",
    prog1_items: progFields.prog1_items ?? "",
    prog2_name: progFields.prog2_name ?? "",
    prog2_items: progFields.prog2_items ?? "",
    prog3_name: progFields.prog3_name ?? "",
    prog3_items: progFields.prog3_items ?? "",
    prog4_name: progFields.prog4_name ?? "",
    prog4_items: progFields.prog4_items ?? "",
  };
}

export async function fetchAdminUniversitiesExport(): Promise<AdminUniversityExportRow[]> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("universities")
    .select(
      `
      name,
      city,
      state,
      country_code,
      is_public,
      is_active,
      is_priority,
      is_scholarship_available,
      description,
      ranking,
      logo_url,
      acceptance_rate,
      intl_students,
      website_url,
      email,
      phone,
      admission_page_url,
      address,
      ielts_min_score,
      toefl_min_score,
      sat_policy,
      documents,
      deadline_date,
      method,
      application_fee,
      intakes,
      tuition_per_year,
      estimated_living_cost_per_year,
      difficulty,
      countries ( name ),
      university_majors (
        majors ( name ),
        university_major_programs (
          programs ( name )
        )
      )
      `,
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin-universities-export]", error);
    throw new Error("Could not load universities for export.");
  }

  return (data ?? []).map((row) =>
    mapUniversityToExportRow(row as unknown as UniversityExportQueryRow),
  );
}
