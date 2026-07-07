import type { ApplicationCallOutcome, ApplicationCallStatus, ApplicationCallType } from "@/lib/application-call-constants";
import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type PostAdmissionCallRow = {
  id: string;
  callType: ApplicationCallType | "post_admission_session";
  durationMinutes: number;
  callDate: string;
  status: ApplicationCallStatus;
  outcome: ApplicationCallOutcome | null;
  summary: string | null;
  authorName: string;
  authorRole: "admin" | "advisor";
  createdAt: string;
};

type CallRowRaw = {
  id: string;
  call_type: string;
  duration_minutes: number;
  call_date: string;
  status: string;
  outcome: string | null;
  summary: string | null;
  author_name: string;
  author_role: string;
  created_at: string;
};

export function mapPostAdmissionCallRow(row: CallRowRaw): PostAdmissionCallRow {
  return {
    id: row.id,
    callType: row.call_type as PostAdmissionCallRow["callType"],
    durationMinutes: row.duration_minutes,
    callDate: row.call_date,
    status: row.status as PostAdmissionCallRow["status"],
    outcome: row.outcome as PostAdmissionCallRow["outcome"],
    summary: row.summary?.trim() || null,
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    createdAt: row.created_at,
  };
}

export async function fetchPostAdmissionCalls(
  client: DbClient,
  caseId: number,
): Promise<PostAdmissionCallRow[]> {
  const { data, error } = await client
    .from("post_admission_calls")
    .select(
      "id, call_type, duration_minutes, call_date, status, outcome, summary, author_name, author_role, created_at",
    )
    .eq("post_admission_case_id", caseId)
    .order("call_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPostAdmissionCalls]", error);
    return [];
  }

  return (data ?? []).map((row) => mapPostAdmissionCallRow(row as CallRowRaw));
}
