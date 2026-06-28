import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationNoteVisibility = "internal" | "public";

export type ApplicationInternalNoteRow = {
  id: string;
  content: string;
  authorName: string;
  authorRole: "admin" | "advisor";
  visibility: ApplicationNoteVisibility;
  createdAt: string;
};

export type StudentPublicApplicationNoteRow = {
  id: string;
  content: string;
  authorName: string;
  authorRole: "admin" | "advisor";
  applicationId: number;
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

type PublicNoteRowRaw = NoteRowRaw & {
  application_id: number;
};

export function parseApplicationNoteVisibility(
  raw: string | null | undefined,
): ApplicationNoteVisibility {
  return raw === "public" ? "public" : "internal";
}

export function mapApplicationInternalNoteRow(row: NoteRowRaw): ApplicationInternalNoteRow {
  return {
    id: row.id,
    content: row.content.trim(),
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    visibility: parseApplicationNoteVisibility(row.visibility),
    createdAt: row.created_at,
  };
}

export function mapStudentPublicApplicationNoteRow(
  row: PublicNoteRowRaw,
): StudentPublicApplicationNoteRow {
  return {
    id: row.id,
    content: row.content.trim(),
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    applicationId: row.application_id,
    createdAt: row.created_at,
  };
}

export async function fetchApplicationInternalNotes(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationInternalNoteRow[]> {
  const { data, error } = await client
    .from("application_internal_notes")
    .select("id, content, author_name, author_role, visibility, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchApplicationInternalNotes]", error);
    return [];
  }

  return (data ?? []).map((row) => mapApplicationInternalNoteRow(row as NoteRowRaw));
}

export async function fetchStudentPublicApplicationNotes(
  client: DbClient,
  studentId: string,
): Promise<StudentPublicApplicationNoteRow[]> {
  const { data, error } = await client
    .from("application_internal_notes")
    .select("id, content, author_name, author_role, application_id, created_at")
    .eq("student_id", studentId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[fetchStudentPublicApplicationNotes]", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapStudentPublicApplicationNoteRow(row as PublicNoteRowRaw),
  );
}
