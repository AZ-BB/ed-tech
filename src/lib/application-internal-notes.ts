import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationInternalNoteRow = {
  id: string;
  content: string;
  authorName: string;
  authorRole: "admin" | "advisor";
  createdAt: string;
};

type NoteRowRaw = {
  id: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
};

export function mapApplicationInternalNoteRow(row: NoteRowRaw): ApplicationInternalNoteRow {
  return {
    id: row.id,
    content: row.content.trim(),
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    createdAt: row.created_at,
  };
}

export async function fetchApplicationInternalNotes(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationInternalNoteRow[]> {
  const { data, error } = await client
    .from("application_internal_notes")
    .select("id, content, author_name, author_role, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchApplicationInternalNotes]", error);
    return [];
  }

  return (data ?? []).map((row) => mapApplicationInternalNoteRow(row as NoteRowRaw));
}
