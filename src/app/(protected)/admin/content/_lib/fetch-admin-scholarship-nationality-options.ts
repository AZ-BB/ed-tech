import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminScholarshipNationalityOption = {
  code: string;
  label: string;
};

export async function fetchAdminScholarshipNationalityOptions(): Promise<
  AdminScholarshipNationalityOption[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("scholarships")
    .select("nationality_country_code");

  if (error) {
    console.error("[admin-content] scholarship nationality options", error);
    return [];
  }

  const codes = new Set<string>();
  for (const row of data ?? []) {
    const code = row.nationality_country_code?.trim();
    if (code) codes.add(code);
  }

  return [...codes]
    .map((code) => ({
      code,
      label: getCountryNameByAlpha2(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}
