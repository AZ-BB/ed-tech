import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminLessonTableRow = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchAdminLessonsPage(): Promise<AdminLessonTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("lesson_documents")
    .select("id, title, description, file_name, file_size, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminLessonsPage]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title?.trim() ?? "",
    description: row.description?.trim() ?? "",
    fileName: row.file_name?.trim() ?? "",
    fileSize: row.file_size ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}
