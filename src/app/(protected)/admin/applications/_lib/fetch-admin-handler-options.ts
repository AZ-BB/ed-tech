import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminHandlerOption = {
  id: string;
  label: string;
};

export const ADMIN_APPLICATIONS_UNASSIGNED_FILTER = "unassigned" as const;

function formatAdminLabel(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email.trim() || "Admin";
}

export async function fetchAdminHandlerOptions(): Promise<AdminHandlerOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id, first_name, last_name, email")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[fetchAdminHandlerOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: formatAdminLabel(
      row.first_name?.trim() ?? "",
      row.last_name?.trim() ?? "",
      row.email?.trim() ?? "",
    ),
  }));
}
