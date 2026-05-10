import { formatDistanceToNow } from "date-fns";

import { createSupabaseServerClient } from "@/utils/supabase-server";

export type SchoolDocumentTableRow = {
  documentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  documentName: string;
  description: string | null;
  isUploaded: boolean;
  updatedIso: string;
  updatedLabel: string;
};

export type SchoolDocumentsPageFilters = {
  q: string;
  /** "" | "missing" | "uploaded" */
  status: string;
  page: number;
  limit: number;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isUploadedRow(status: string, storagePath: string | null): boolean {
  if (storagePath) return true;
  return status === "submitted";
}

function updatedLabelFromIso(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function normalizeDocStatus(raw: string): "" | "missing" | "uploaded" {
  if (raw === "missing" || raw === "uploaded") return raw;
  return "";
}

type DocQueryRow = {
  id: string;
  student_id: string;
  display_name: string;
  description: string | null;
  status: string;
  storage_path: string | null;
  updated_at: string;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

export async function fetchSchoolDocumentsPage(
  filters: SchoolDocumentsPageFilters,
): Promise<{
  rows: SchoolDocumentTableRow[];
  totalRows: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { rows: [], totalRows: 0 };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) {
    return { rows: [], totalRows: 0 };
  }

  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  const qTrim = filters.q.trim();
  const docStatus = normalizeDocStatus(filters.status);

  let q = supabase
    .from("student_my_application_documents")
    .select(
      `
      id,
      student_id,
      display_name,
      description,
      status,
      storage_path,
      updated_at,
      student_profiles!inner (
        first_name,
        last_name,
        email,
        school_id
      )
    `,
      { count: "exact" },
    )
    .eq("student_profiles.school_id", schoolId);

  if (qTrim) {
    const e = escapeIlike(qTrim);
    const p = `%${e}%`;
    q = q.or(
      `display_name.ilike.${p},description.ilike.${p},student_profiles.first_name.ilike.${p},student_profiles.last_name.ilike.${p},student_profiles.email.ilike.${p}`,
    );
  }

  if (docStatus === "missing") {
    q = q.is("storage_path", null).neq("status", "submitted");
  } else if (docStatus === "uploaded") {
    q = q.or("status.eq.submitted,storage_path.not.is.null");
  }

  q = q
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error("[fetchSchoolDocumentsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const totalRows = count ?? 0;

  const rows: SchoolDocumentTableRow[] = (data ?? []).map((raw) => {
    const d = raw as unknown as DocQueryRow;
    const sp = d.student_profiles;
    const uploaded = isUploadedRow(d.status, d.storage_path);
    return {
      documentId: d.id,
      studentId: d.student_id,
      firstName: sp?.first_name?.trim() ?? "",
      lastName: sp?.last_name?.trim() ?? "",
      email: sp?.email?.trim() ?? "",
      documentName: d.display_name,
      description: d.description,
      isUploaded: uploaded,
      updatedIso: d.updated_at,
      updatedLabel: updatedLabelFromIso(d.updated_at),
    };
  });

  return { rows, totalRows };
}
