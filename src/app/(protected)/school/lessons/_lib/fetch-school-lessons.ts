import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type SchoolLessonRow = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string | null;
};

export async function fetchSchoolLessonsPage(): Promise<SchoolLessonRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("lesson_documents")
    .select("id, title, description, file_name, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchSchoolLessonsPage]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title?.trim() ?? "",
    description: row.description?.trim() ?? "",
    fileName: row.file_name?.trim() ?? "",
    createdAt: row.created_at ?? null,
  }));
}
