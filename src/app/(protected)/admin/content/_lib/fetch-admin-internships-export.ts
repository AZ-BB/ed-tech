import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminInternshipExportRow = {
  slug: string;
  name: string;
  provider: string;
  section: string;
  country_code: string;
  location_label: string;
  format: string;
  field: string;
  pay_tier: string;
  pay_label: string;
  duration: string;
  phone: string;
  nationals_only: string;
  official_url: string;
  url_status: string;
  needs_review: string;
  is_active: string;
  summary: string;
  what_youll_do: string;
  what_youll_gain: string;
  eligibility: string;
  how_to_apply: string;
};

function pipeArray(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "";
  return values
    .map((v) => v.trim())
    .filter(Boolean)
    .join("|");
}

export async function fetchAdminInternshipsExport(): Promise<
  AdminInternshipExportRow[]
> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("internships")
    .select(
      `
      slug,
      name,
      provider,
      section,
      country_code,
      location_label,
      format,
      field,
      pay_tier,
      pay_label,
      duration,
      phone,
      nationals_only,
      official_url,
      url_status,
      needs_review,
      is_active,
      summary,
      what_youll_do,
      what_youll_gain,
      eligibility,
      how_to_apply
      `,
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin-internships-export]", error);
    throw new Error("Could not load internships for export.");
  }

  return (data ?? []).map((row) => ({
    slug: row.slug?.trim() ?? "",
    name: row.name,
    provider: row.provider,
    section: row.section,
    country_code: row.country_code,
    location_label: row.location_label,
    format: row.format,
    field: row.field,
    pay_tier: row.pay_tier,
    pay_label: row.pay_label,
    duration: row.duration,
    phone: row.phone?.trim() ?? "",
    nationals_only: row.nationals_only ? "true" : "false",
    official_url: row.official_url,
    url_status: row.url_status,
    needs_review: row.needs_review ? "true" : "false",
    is_active: row.is_active ? "true" : "false",
    summary: row.summary,
    what_youll_do: pipeArray(row.what_youll_do),
    what_youll_gain: pipeArray(row.what_youll_gain),
    eligibility: row.eligibility,
    how_to_apply: row.how_to_apply,
  }));
}
