import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminPlanOption = {
  id: number;
  label: string;
};

export async function fetchAdminPlanOptions(): Promise<AdminPlanOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("applications_plans")
    .select("id, name, universities_count, price")
    .eq("is_active", true)
    .order("universities_count", { ascending: true });

  if (error) {
    console.error("[fetchAdminPlanOptions]", error);
    return [];
  }

  return (data ?? []).map((plan) => {
    const count = plan.universities_count;
    const label =
      Number.isFinite(count) && count > 0
        ? `${count} ${count === 1 ? "university" : "universities"}`
        : plan.name?.trim() || `Plan #${plan.id}`;
    return { id: plan.id, label };
  });
}
