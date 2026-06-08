import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminContactSubmissionsPageFilters } from "./parse-admin-contact-submissions-search-params";

type ContactSubmissionStatus =
  Database["public"]["Enums"]["contact_submission_status"];

export type AdminContactSubmissionTableRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactSubmissionStatus;
  createdAt: string | null;
};

export async function fetchAdminContactSubmissionsPage(
  filters: AdminContactSubmissionsPageFilters,
): Promise<{ rows: AdminContactSubmissionTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("contact_submissions")
    .select("id, name, email, subject, message, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const trimmedQ = q.trim();
  if (trimmedQ) {
    const e = escapeIlike(trimmedQ);
    query = query.or(
      `name.ilike.%${e}%,email.ilike.%${e}%,subject.ilike.%${e}%,message.ilike.%${e}%`,
    );
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminContactSubmissionsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminContactSubmissionTableRow[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() ?? "",
    email: row.email?.trim() ?? "",
    subject: row.subject?.trim() || null,
    message: row.message?.trim() ?? "",
    status: row.status,
    createdAt: row.created_at ?? null,
  }));

  return { rows, totalRows: count ?? 0 };
}
