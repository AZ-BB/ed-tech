import "server-only";

import {
  parseApplicationSupportPayloadFromApplication,
  resolvePlanUniversitiesCount,
  type ApplicationSupportPayload,
} from "@/lib/application-support-intake";
import type { Database } from "@/database.types";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdvisorEditableApplicationIntake = {
  id: number;
  initialPayload: ApplicationSupportPayload;
};

/** @deprecated Use AdvisorEditableApplicationIntake */
export type AdvisorSessionEditableApplication = AdvisorEditableApplicationIntake;

type ApplicationIntakeRow = Pick<
  Database["public"]["Tables"]["applications"]["Row"],
  | "id"
  | "student_name"
  | "student_email"
  | "student_phone"
  | "school_name"
  | "final_grade"
  | "inteended_fields"
  | "preferred_uni_or_countries"
  | "preferences_universities"
  | "preferences_universities_notes"
  | "additional_notes"
> & {
  applications_plans?:
    | { universities_count: number }
    | { universities_count: number }[]
    | null;
};

export function mapApplicationRowToEditableIntake(
  row: ApplicationIntakeRow,
  fallbackPlanUniversitiesCount?: 5 | 10 | 15,
): AdvisorEditableApplicationIntake {
  const planEmbed = row.applications_plans;
  const plan = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;
  const planUniversitiesCount =
    fallbackPlanUniversitiesCount ??
    resolvePlanUniversitiesCount(plan?.universities_count);

  return {
    id: row.id,
    initialPayload: parseApplicationSupportPayloadFromApplication(
      row,
      planUniversitiesCount,
    ),
  };
}

export async function fetchAdvisorSessionEditableApplication(
  secret: SecretClient,
  input: { studentId: string; advisorId: string },
): Promise<AdvisorEditableApplicationIntake | null> {
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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorSessionEditableApplication]", error);
    return null;
  }

  if (!data) return null;

  return mapApplicationRowToEditableIntake(data);
}
