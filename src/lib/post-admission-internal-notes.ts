import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type PostAdmissionNoteVisibility = "internal" | "public";

export type PostAdmissionInternalNoteRow = {
  id: string;
  content: string;
  authorName: string;
  authorRole: "admin" | "advisor";
  visibility: PostAdmissionNoteVisibility;
  createdAt: string;
};

type NoteRowRaw = {
  id: string;
  content: string;
  author_name: string;
  author_role: string;
  visibility?: string | null;
  created_at: string;
};

export function parsePostAdmissionNoteVisibility(
  raw: string | null | undefined,
): PostAdmissionNoteVisibility {
  return raw === "public" ? "public" : "internal";
}

export function mapPostAdmissionInternalNoteRow(
  row: NoteRowRaw,
): PostAdmissionInternalNoteRow {
  return {
    id: row.id,
    content: row.content.trim(),
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    visibility: parsePostAdmissionNoteVisibility(row.visibility),
    createdAt: row.created_at,
  };
}

export async function fetchPostAdmissionInternalNotes(
  client: DbClient,
  caseId: number,
): Promise<PostAdmissionInternalNoteRow[]> {
  const { data, error } = await client
    .from("post_admission_internal_notes")
    .select("id, content, author_name, author_role, visibility, created_at")
    .eq("post_admission_case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPostAdmissionInternalNotes]", error);
    return [];
  }

  return (data ?? []).map((row) => mapPostAdmissionInternalNoteRow(row as NoteRowRaw));
}
