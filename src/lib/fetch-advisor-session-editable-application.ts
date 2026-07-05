import "server-only";

import {
  parseApplicationSupportPayloadFromApplication,
  resolvePlanUniversitiesCount,
  type ApplicationSupportPayload,
} from "@/lib/application-support-intake";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdvisorSessionEditableApplication = {
  id: number;
  initialPayload: ApplicationSupportPayload;
};

export async function fetchAdvisorSessionEditableApplication(
  secret: SecretClient,
  input: { studentId: string; advisorId: string },
): Promise<AdvisorSessionEditableApplication | null> {
  const { data, error } = await secret
    .from("applications")
    .select(
      `
      id,
      student_name,
      student_email,
      student_phone,
      school_name,
      final_grade,
      inteended_fields,
      preferred_uni_or_countries,
      preferences_universities,
      preferences_universities_notes,
      additional_notes,
      applications_plans!applications_plan_id_fkey ( universities_count )
    `,
    )
    .eq("student_id", input.studentId)
    .eq("assigned_to", input.advisorId)
    .eq("status", "lead")
    .is("scheduled_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorSessionEditableApplication]", error);
    return null;
  }

  if (!data) return null;

  const planEmbed = data.applications_plans as
    | { universities_count: number }
    | { universities_count: number }[]
    | null;
  const plan = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;
  const planUniversitiesCount = resolvePlanUniversitiesCount(plan?.universities_count);

  return {
    id: data.id,
    initialPayload: parseApplicationSupportPayloadFromApplication(
      data,
      planUniversitiesCount,
    ),
  };
}
