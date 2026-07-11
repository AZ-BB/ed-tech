import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminApplicationAdvisorOption = {
  id: string;
  label: string;
};

export const ADMIN_APPLICATIONS_UNASSIGNED_FILTER = "unassigned" as const;
export const ADMIN_APPLICATIONS_ADVISOR_PREFIX = "advisor:" as const;

type FetchAdminApplicationAdvisorOptionsParams = {
  /** Keep the current assignment visible in the assign modal when marked inactive. */
  includeAdvisorId?: string | null;
};

function formatAdvisorLabel(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email.trim() || "Advisor";
}

export async function fetchAdminApplicationAdvisorOptions(
  params?: FetchAdminApplicationAdvisorOptionsParams,
): Promise<AdminApplicationAdvisorOption[]> {
  const supabase = await createSupabaseSecretClient();
  const includeAdvisorId = params?.includeAdvisorId?.trim() ?? "";

  let query = supabase
    .from("advisors")
    .select("id, first_name, last_name, email")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (includeAdvisorId) {
    query = query.or(`is_active.eq.true,id.eq.${includeAdvisorId}`);
  } else {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminApplicationAdvisorOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: formatAdvisorLabel(
      row.first_name?.trim() ?? "",
      row.last_name?.trim() ?? "",
      row.email?.trim() ?? "",
    ),
  }));
}
