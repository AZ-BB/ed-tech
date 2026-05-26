import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminUniversityCountryOption = {
  code: string;
  label: string;
};

export async function fetchAdminUniversityCountryOptions(): Promise<
  AdminUniversityCountryOption[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("universities")
    .select("country_code");

  if (error) {
    console.error("[admin-content] university country options", error);
    return [];
  }

  const codes = new Set<string>();
  for (const row of data ?? []) {
    const code = row.country_code?.trim();
    if (code) codes.add(code);
  }

  return [...codes]
    .map((code) => ({
      code,
      label: getCountryNameByAlpha2(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}
