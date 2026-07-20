import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type StudentCreditAssignmentActor =
  | { kind: "school_admin"; id: string }
  | { kind: "platform_admin"; id: string };

function displayNameFromParts(first: string | null | undefined, last: string | null | undefined) {
  const full = [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
  return full || null;
}

async function resolveActorName(
  secret: SecretClient,
  actor: StudentCreditAssignmentActor,
): Promise<string> {
  if (actor.kind === "school_admin") {
    const { data } = await secret
      .from("school_admin_profiles")
      .select("first_name, last_name")
      .eq("id", actor.id)
      .maybeSingle();
    return displayNameFromParts(data?.first_name, data?.last_name) ?? "School admin";
  }

  const { data } = await secret
    .from("admins")
    .select("first_name, last_name")
    .eq("id", actor.id)
    .maybeSingle();
  return displayNameFromParts(data?.first_name, data?.last_name) ?? "Platform admin";
}

async function resolveStudentName(secret: SecretClient, studentId: string): Promise<string> {
  const { data } = await secret
    .from("student_profiles")
    .select("first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();
  return displayNameFromParts(data?.first_name, data?.last_name) ?? "Student";
}

function creditTypePhrase(type: "advisor" | "ambassador", amount: number): string {
  const label = type === "advisor" ? "advisor" : "ambassador";
  return `${amount.toLocaleString()} ${label} credit${amount === 1 ? "" : "s"}`;
}

function buildAssignmentMessage(parts: string[], studentName: string): string {
  if (parts.length === 1) {
    return `Assigned ${parts[0]} to ${studentName}.`;
  }
  return `Assigned ${parts.slice(0, -1).join(", ")} and ${parts.at(-1)} to ${studentName}.`;
}

export async function recordStudentCreditAssignments(
  secret: SecretClient,
  input: {
    studentId: string;
    schoolId: string | null;
    advisorToAdd: number;
    ambassadorToAdd: number;
    actor: StudentCreditAssignmentActor;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { studentId, schoolId, advisorToAdd, ambassadorToAdd, actor } = input;
  const now = new Date().toISOString();
  const inserts: Array<{
    student_id: string;
    school_id: string | null;
    amount: number;
    type: "advisor" | "ambassador";
    status: "added";
    assigned_by_admin_id: string | null;
    assigned_by_school_admin_id: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  const assignedByAdminId = actor.kind === "platform_admin" ? actor.id : null;
  const assignedBySchoolAdminId = actor.kind === "school_admin" ? actor.id : null;

  if (advisorToAdd > 0) {
    inserts.push({
      student_id: studentId,
      school_id: schoolId,
      amount: advisorToAdd,
      type: "advisor",
      status: "added",
      assigned_by_admin_id: assignedByAdminId,
      assigned_by_school_admin_id: assignedBySchoolAdminId,
      created_at: now,
      updated_at: now,
    });
  }

  if (ambassadorToAdd > 0) {
    inserts.push({
      student_id: studentId,
      school_id: schoolId,
      amount: ambassadorToAdd,
      type: "ambassador",
      status: "added",
      assigned_by_admin_id: assignedByAdminId,
      assigned_by_school_admin_id: assignedBySchoolAdminId,
      created_at: now,
      updated_at: now,
    });
  }

  if (inserts.length === 0) {
    return { ok: true };
  }

  const { error: historyError } = await secret.from("student_credits_history").insert(inserts);
  if (historyError) {
    console.error("[recordStudentCreditAssignments] history", historyError);
    return {
      ok: false,
      error: "Credits were updated but the assignment history could not be saved.",
    };
  }

  const [actorName, studentName] = await Promise.all([
    resolveActorName(secret, actor),
    resolveStudentName(secret, studentId),
  ]);

  const messageParts: string[] = [];
  if (advisorToAdd > 0) messageParts.push(creditTypePhrase("advisor", advisorToAdd));
  if (ambassadorToAdd > 0) {
    messageParts.push(creditTypePhrase("ambassador", ambassadorToAdd));
  }

  const actorRole = actor.kind === "platform_admin" ? "Platform admin" : "School admin";
  const logMessage = `${actorRole} ${actorName} ${buildAssignmentMessage(messageParts, studentName)}`;

  const { error: logError } = await secret.from("acitivity_logs").insert({
    entitiy_type: "student",
    entity_id: studentId,
    action: "student_credits_assigned",
    message: logMessage,
    created_by_type: actor.kind === "platform_admin" ? "admin" : "school_admin",
    admin_id: assignedByAdminId,
    school_admin_id: assignedBySchoolAdminId,
    student_id: studentId,
  });

  if (logError) {
    console.error("[recordStudentCreditAssignments] activity log", logError);
    return {
      ok: false,
      error: "Credits were updated but the activity log could not be saved.",
    };
  }

  return { ok: true };
}

export function formatCreditHistoryAmount(amount: number, _status?: string | null): string {
  return amount.toLocaleString();
}

export function formatCreditHistoryStatus(status: string | null): string {
  switch (status) {
    case "added":
      return "Added";
    case "used":
      return "Used";
    case "refunded":
      return "Refunded";
    default:
      return status ?? "—";
  }
}

export function formatCreditAssignerName(input: {
  adminFirst?: string | null;
  adminLast?: string | null;
  schoolAdminFirst?: string | null;
  schoolAdminLast?: string | null;
}): string {
  const platformName = displayNameFromParts(input.adminFirst, input.adminLast);
  if (platformName) return platformName;

  const schoolName = displayNameFromParts(input.schoolAdminFirst, input.schoolAdminLast);
  if (schoolName) return schoolName;

  return "—";
}
