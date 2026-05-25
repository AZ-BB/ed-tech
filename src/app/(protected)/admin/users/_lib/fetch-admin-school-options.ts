import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminSchoolOption = {
  id: string;
  name: string;
};

export async function fetchAdminSchoolOptions(): Promise<AdminSchoolOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin-users] schools", error);
    return [];
  }

  return (data ?? []).map((school) => ({
    id: school.id,
    name: school.name.trim(),
  }));
}
