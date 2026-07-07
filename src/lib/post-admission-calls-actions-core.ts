import {
  APPLICATION_CALL_TYPE_LABEL,
  callStatusRequiresOutcome,
  isApplicationCallOutcome,
  isApplicationCallStatus,
  isApplicationCallType,
  type ApplicationCallOutcome,
  type ApplicationCallStatus,
  type ApplicationCallType,
} from "@/lib/application-call-constants";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PostAdmissionCallsActionResult = { ok: true } | { ok: false; error: string };

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type LogPostAdmissionCallInput = {
  caseId: number;
  callType: string;
  durationMinutes: number;
  callDate: string;
  status: string;
  outcome: string | null;
  summary: string | null;
};

export function parsePostAdmissionCaseId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export function parsePostAdmissionCallId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

function parseDateOnly(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!DATE_RE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

async function loadCaseStudentId(secret: SecretClient, caseId: number) {
  const { data, error } = await secret
    .from("post_admission_cases")
    .select("id, student_id")
    .eq("id", caseId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function validateCallFields(input: {
  callType: string;
  durationMinutes: number;
  callDate: string;
  status: string;
  outcome: string | null;
  summary: string | null;
}):
  | {
      ok: true;
      data: {
        callType: ApplicationCallType;
        durationMinutes: number;
        callDate: string;
        status: ApplicationCallStatus;
        outcome: ApplicationCallOutcome | null;
        summary: string | null;
      };
    }
  | { ok: false; error: string } {
  if (!isApplicationCallType(input.callType)) {
    return { ok: false, error: "Select a valid call type." };
  }

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 1) {
    return { ok: false, error: "Duration must be at least 1 minute." };
  }

  const callDate = parseDateOnly(input.callDate);
  if (!callDate) {
    return { ok: false, error: "Enter a valid call date." };
  }

  if (!isApplicationCallStatus(input.status)) {
    return { ok: false, error: "Select a valid status." };
  }

  let outcome: ApplicationCallOutcome | null = null;
  if (callStatusRequiresOutcome(input.status)) {
    if (input.outcome && isApplicationCallOutcome(input.outcome)) {
      outcome = input.outcome;
    }
  }

  const summary = input.summary?.trim() || null;
  if (summary && summary.length > 8000) {
    return { ok: false, error: "Summary is too long (max 8,000 characters)." };
  }

  return {
    ok: true,
    data: {
      callType: input.callType,
      durationMinutes: Math.round(input.durationMinutes),
      callDate,
      status: input.status,
      outcome,
      summary,
    },
  };
}

export async function logPostAdmissionCallCore(
  secret: SecretClient,
  input: LogPostAdmissionCallInput,
  actor: {
    userId: string;
    actorName: string;
    authorRole: "admin" | "advisor";
    adminId?: string | null;
  },
): Promise<PostAdmissionCallsActionResult> {
  const fields = validateCallFields(input);
  if (!fields.ok) return fields;

  const caseRow = await loadCaseStudentId(secret, input.caseId);
  if (!caseRow) return { ok: false, error: "Post-admission case not found." };

  const now = new Date().toISOString();
  const { error: callError } = await secret.from("post_admission_calls").insert({
    post_admission_case_id: input.caseId,
    call_type: fields.data.callType,
    duration_minutes: fields.data.durationMinutes,
    call_date: fields.data.callDate,
    status: fields.data.status,
    outcome: fields.data.outcome,
    summary: fields.data.summary,
    author_user_id: actor.userId,
    author_role: actor.authorRole,
    author_name: actor.actorName,
    created_at: now,
    updated_at: now,
  });

  if (callError) {
    console.error("[logPostAdmissionCallCore] insert call", callError);
    return { ok: false, error: "Could not log call." };
  }

  const typeLabel = APPLICATION_CALL_TYPE_LABEL[fields.data.callType];
  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(input.caseId),
    action: "post_admission_call_logged",
    message: `${actor.actorName} logged a ${typeLabel} (${fields.data.status}) for post-admission case #${input.caseId}.`,
    created_by_type: "admin",
    admin_id: actor.adminId ?? null,
    school_admin_id: null,
    student_id: caseRow.student_id,
  });

  if (logErr) {
    console.error("[logPostAdmissionCallCore] activity log", logErr);
  }

  return { ok: true };
}
