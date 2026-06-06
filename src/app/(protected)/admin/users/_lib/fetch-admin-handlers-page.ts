import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminHandlerTableRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string | null;
};

export async function fetchAdminHandlersPage(): Promise<AdminHandlerTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("handlers")
    .select("id, first_name, last_name, email, phone, is_active, created_at")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[fetchAdminHandlersPage]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name?.trim() ?? "",
    lastName: row.last_name?.trim() ?? "",
    email: row.email?.trim() ?? "",
    phone: row.phone?.trim() || null,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}
