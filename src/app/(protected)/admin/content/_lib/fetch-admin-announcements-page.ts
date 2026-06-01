import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminAnnouncementTableRow = {
  id: number;
  title: string;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchAdminAnnouncementsPage(): Promise<AdminAnnouncementTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, content, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminAnnouncementsPage]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title?.trim() ?? "",
    content: row.content?.trim() ?? "",
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}
