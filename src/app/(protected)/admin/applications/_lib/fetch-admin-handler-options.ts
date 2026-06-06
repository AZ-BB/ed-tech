import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminHandlerOption = {
  id: string;
  label: string;
};

export const ADMIN_APPLICATIONS_UNASSIGNED_FILTER = "unassigned" as const;

type FetchAdminHandlerOptionsParams = {
  /** Keep the current assignment visible in the assign modal when marked inactive. */
  includeHandlerId?: string | null;
};

function formatHandlerLabel(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email.trim() || "Handler";
}

export async function fetchAdminHandlerOptions(
  params?: FetchAdminHandlerOptionsParams,
): Promise<AdminHandlerOption[]> {
  const supabase = await createSupabaseSecretClient();
  const includeHandlerId = params?.includeHandlerId?.trim() ?? "";

  let query = supabase
    .from("handlers")
    .select("id, first_name, last_name, email")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (includeHandlerId) {
    query = query.or(`is_active.eq.true,id.eq.${includeHandlerId}`);
  } else {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminHandlerOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: formatHandlerLabel(
      row.first_name?.trim() ?? "",
      row.last_name?.trim() ?? "",
      row.email?.trim() ?? "",
    ),
  }));
}
