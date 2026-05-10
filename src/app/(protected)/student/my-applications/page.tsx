import {
  ensureStudentApplicationDocuments,
} from "@/lib/ensure-student-application-documents";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { notFound, redirect } from "next/navigation";

import { MyApplicationsClient } from "./_components/my-applications-client";
import type { ActivityShortlistQueryRow } from "./_lib/normalize-activity-shortlist";
import { normalizeActivityShortlistUniversities } from "./_lib/normalize-activity-shortlist";
import type { MyApplicationsInitialPayload } from "./_lib/my-applications-types";

export const dynamic = "force-dynamic";

export default async function MyApplicationsPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const secret = await createSupabaseSecretClient();

  const { data: profile, error: pErr } = await secret
    .from("student_profiles")
    .select("*")
    .eq("id", auth.studentId)
    .maybeSingle();
  if (pErr || !profile) {
    console.error(pErr ?? "missing student_profiles row");
    notFound();
  }

  const { data: countries } = await secret.from("countries").select("id, name").order("name", { ascending: true });

  const [
    { data: applicationProfile },
    { data: shortlist },
    { data: essays },
    { data: recommendations },
    { data: tasks },
    { data: activityShortlistRows },
  ] = await Promise.all([
    secret.from("student_application_profile").select("*").eq("student_id", auth.studentId).maybeSingle(),
    secret
      .from("student_shortlist_universities")
      .select("*")
      .eq("student_id", auth.studentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    secret
      .from("student_my_application_essays")
      .select("*")
      .eq("student_id", auth.studentId)
      .order("updated_at", { ascending: false }),
    secret
      .from("student_my_application_recommendations")
      .select("*")
      .eq("student_id", auth.studentId)
      .order("requested_at", { ascending: false }),
    secret
      .from("student_my_application_tasks")
      .select("*")
      .eq("student_id", auth.studentId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    secret
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        uni_id,
        universities (
          id,
          name,
          city,
          country_code,
          method,
          deadline_date,
          countries ( name )
        )
      `,
      )
      .eq("student_id", auth.studentId)
      .eq("entity_type", "university")
      .eq("type", "shortlist")
      .not("uni_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const documents = await ensureStudentApplicationDocuments(secret, auth.studentId);

  const activityShortlistedUniversities = normalizeActivityShortlistUniversities(
    (activityShortlistRows ?? []) as ActivityShortlistQueryRow[],
  );

  const payload: MyApplicationsInitialPayload = {
    studentId: auth.studentId,
    profile,
    countries: countries ?? [],
    applicationProfile: applicationProfile ?? null,
    activityShortlistedUniversities,
    shortlist: shortlist ?? [],
    documents,
    essays: essays ?? [],
    recommendations: recommendations ?? [],
    tasks: tasks ?? [],
  };

  return <MyApplicationsClient initial={payload} />;
}
