import { formatDistanceToNow } from "date-fns";

import { createSupabaseServerClient } from "@/utils/supabase-server";

export type PendingInviteRow = {
  id: string;
  email: string;
  grade: string | null;
  invitedLabel: string;
};

export type PendingInvitesPageFilters = {
  q: string;
  page: number;
  limit: number;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function fetchPendingInvitesPage(
  filters: PendingInvitesPageFilters,
): Promise<{ rows: PendingInviteRow[]; totalRows: number }> {
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

  let listQuery = supabase
    .from("school_students")
    .select("id, email, grade, created_at", {
      count: "exact",
    })
    .eq("school_id", schoolId)
    .eq("signed_up", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const qTrim = filters.q.trim();
  if (qTrim) {
    const e = escapeIlike(qTrim);
    listQuery = listQuery.ilike("email", `%${e}%`);
  }

  const { data: raw, error: listErr, count } = await listQuery;

  if (listErr || !raw) {
    console.error(listErr);
    return { rows: [], totalRows: 0 };
  }

  const totalRows = count ?? 0;

  const rows: PendingInviteRow[] = raw.map((r) => {
    const created = r.created_at ? new Date(r.created_at) : null;
    let invitedLabel = "—";
    if (created && !Number.isNaN(created.getTime())) {
      try {
        invitedLabel = formatDistanceToNow(created, { addSuffix: true });
      } catch {
        invitedLabel = "—";
      }
    }

    return {
      id: r.id,
      email: r.email?.trim() ?? "",
      grade: r.grade?.trim() ?? null,
      invitedLabel,
    };
  });

  return { rows, totalRows };
}
