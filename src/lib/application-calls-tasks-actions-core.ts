import {
  APPLICATION_CALL_TYPE_LABEL,
  type ApplicationCallOutcome,
  type ApplicationCallStatus,
  type ApplicationCallType,
  callStatusRequiresOutcome,
  isApplicationCallOutcome,
  isApplicationCallStatus,
  isApplicationCallType,
} from "@/lib/application-call-constants";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  isApplicationTaskPriority,
  type ApplicationTaskPriority,
} from "@/lib/application-task-constants";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type CallsTasksActionResult = { ok: true } | { ok: false; error: string };

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type LogApplicationCallInput = {
  applicationId: number;
  callType: string;
  durationMinutes: number;
  callDate: string;
  status: string;
  outcome: string | null;
  summary: string | null;
  createFollowUpTask: boolean;
  followUpTaskTitle: string | null;
  followUpTaskDueDate: string | null;
};

export type CreateApplicationTaskInput = {
  applicationId: number;
  title: string;
  dueDate: string | null;
  priority: string;
  sourceCallId?: string | null;
};

export type UpdateApplicationCallInput = {
  callId: string;
  callType: string;
  durationMinutes: number;
  callDate: string;
  status: string;
  outcome: string | null;
  summary: string | null;
};

export function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export function parseApplicationTaskId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

export function parseApplicationCallId(raw: string): string | null {
  return parseApplicationTaskId(raw);
}

function parseDateOnly(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!DATE_RE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

async function loadApplicationStudentId(secret: SecretClient, applicationId: number) {
  const { data, error } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function insertApplicationCallsTasksActivityLog(
  secret: SecretClient,
  input: {
    applicationId: number;
    studentId: string;
    action: string;
    message: string;
    adminId?: string | null;
  },
) {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(input.applicationId),
    action: input.action,
    message: input.message,
    created_by_type: "admin",
    admin_id: input.adminId ?? null,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (error) {
    console.error("[application-calls-tasks] activity log", error);
  }
}

function validateCallFields(input: {
  callType: string;
  durationMinutes: number;
  callDate: string;
  status: string;
  outcome: string | null;
  summary: string | null;
}): {
  ok: true;
  data: {
    callType: ApplicationCallType;
    durationMinutes: number;
    callDate: string;
    status: ApplicationCallStatus;
    outcome: ApplicationCallOutcome | null;
    summary: string | null;
  };
} | { ok: false; error: string } {
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

function validateLogCallInput(input: LogApplicationCallInput): {
  ok: true;
  data: {
    callType: ApplicationCallType;
    durationMinutes: number;
    callDate: string;
    status: ApplicationCallStatus;
    outcome: ApplicationCallOutcome | null;
    summary: string | null;
    followUpTaskTitle: string | null;
    followUpTaskDueDate: string | null;
  };
} | { ok: false; error: string } {
  const fields = validateCallFields(input);
  if (!fields.ok) return fields;

  let followUpTaskTitle: string | null = null;
  let followUpTaskDueDate: string | null = null;

  if (input.createFollowUpTask) {
    followUpTaskTitle = input.followUpTaskTitle?.trim() || null;
    if (!followUpTaskTitle) {
      return { ok: false, error: "Enter a task name for the follow-up." };
    }
    if (followUpTaskTitle.length > 500) {
      return { ok: false, error: "Task name is too long (max 500 characters)." };
    }
    followUpTaskDueDate = parseDateOnly(input.followUpTaskDueDate);
    if (!followUpTaskDueDate) {
      return { ok: false, error: "Enter a valid due date for the follow-up task." };
    }
  }

  return {
    ok: true,
    data: {
      ...fields.data,
      followUpTaskTitle,
      followUpTaskDueDate,
    },
  };
}

export async function logApplicationCallCore(
  secret: SecretClient,
  input: LogApplicationCallInput,
  actor: {
    userId: string;
    actorName: string;
    authorRole: "admin" | "advisor";
    adminId?: string | null;
  },
): Promise<CallsTasksActionResult> {
  const validated = validateLogCallInput(input);
  if (!validated.ok) return validated;

  const application = await loadApplicationStudentId(secret, input.applicationId);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { data: callRow, error: callError } = await secret
    .from("application_calls")
    .insert({
      application_id: input.applicationId,
      call_type: validated.data.callType,
      duration_minutes: validated.data.durationMinutes,
      call_date: validated.data.callDate,
      status: validated.data.status,
      outcome: validated.data.outcome,
      summary: validated.data.summary,
      author_user_id: actor.userId,
      author_role: actor.authorRole,
      author_name: actor.actorName,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (callError || !callRow) {
    console.error("[logApplicationCallCore] insert call", callError);
    return { ok: false, error: "Could not log call." };
  }

  const typeLabel = APPLICATION_CALL_TYPE_LABEL[validated.data.callType];
  await insertApplicationCallsTasksActivityLog(secret, {
    applicationId: input.applicationId,
    studentId: application.student_id,
    adminId: actor.adminId ?? null,
    action: "application_call_logged",
    message: `${actor.actorName} logged ${typeLabel} (${validated.data.status.replace("_", " ")}) for application #${input.applicationId}.`,
  });

  if (input.createFollowUpTask && validated.data.followUpTaskTitle) {
    const taskResult = await createApplicationTaskCore(
      secret,
      {
        applicationId: input.applicationId,
        title: validated.data.followUpTaskTitle,
        dueDate: validated.data.followUpTaskDueDate,
        priority: "medium",
        sourceCallId: callRow.id,
      },
      actor,
    );
    if (!taskResult.ok) return taskResult;
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", input.applicationId);

  return { ok: true };
}

function validateCreateTaskInput(input: CreateApplicationTaskInput): {
  ok: true;
  data: {
    title: string;
    dueDate: string | null;
    priority: ApplicationTaskPriority;
    sourceCallId: string | null;
  };
} | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Task name cannot be empty." };
  if (title.length > 500) return { ok: false, error: "Task name is too long (max 500 characters)." };

  const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;
  if (input.dueDate && !dueDate) {
    return { ok: false, error: "Enter a valid due date." };
  }

  if (!isApplicationTaskPriority(input.priority)) {
    return { ok: false, error: "Select a valid priority." };
  }

  const sourceCallId = input.sourceCallId?.trim() || null;
  if (sourceCallId && !UUID_RE.test(sourceCallId)) {
    return { ok: false, error: "Invalid linked call." };
  }

  return {
    ok: true,
    data: { title, dueDate, priority: input.priority, sourceCallId },
  };
}

export async function createApplicationTaskCore(
  secret: SecretClient,
  input: CreateApplicationTaskInput,
  actor: {
    userId: string;
    actorName: string;
    authorRole: "admin" | "advisor";
    adminId?: string | null;
  },
  options?: { skipActivityLog?: boolean },
): Promise<CallsTasksActionResult> {
  const validated = validateCreateTaskInput(input);
  if (!validated.ok) return validated;

  const application = await loadApplicationStudentId(secret, input.applicationId);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret.from("application_tasks").insert({
    application_id: input.applicationId,
    title: validated.data.title,
    due_date: validated.data.dueDate,
    priority: validated.data.priority,
    completed: false,
    source_call_id: validated.data.sourceCallId,
    author_user_id: actor.userId,
    author_role: actor.authorRole,
    author_name: actor.actorName,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.error("[createApplicationTaskCore] insert", error);
    return { ok: false, error: "Could not create task." };
  }

  if (!options?.skipActivityLog) {
    await insertApplicationCallsTasksActivityLog(secret, {
      applicationId: input.applicationId,
      studentId: application.student_id,
      adminId: actor.adminId ?? null,
      action: "application_task_created",
      message: `${actor.actorName} created task "${validated.data.title}" for application #${input.applicationId}.`,
    });
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", input.applicationId);

  return { ok: true };
}

export async function toggleApplicationTaskCompletedCore(
  secret: SecretClient,
  taskId: string,
  completed: boolean,
  actor: {
    actorName: string;
    adminId?: string | null;
  },
): Promise<CallsTasksActionResult & { applicationId?: number }> {
  const { data: task, error: fetchError } = await secret
    .from("application_tasks")
    .select("id, application_id, title, completed")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError || !task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.completed === completed) {
    return { ok: true, applicationId: task.application_id };
  }

  const application = await loadApplicationStudentId(secret, task.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_tasks")
    .update({ completed, updated_at: now })
    .eq("id", taskId);

  if (error) {
    console.error("[toggleApplicationTaskCompletedCore]", error);
    return { ok: false, error: "Could not update task." };
  }

  await insertApplicationCallsTasksActivityLog(secret, {
    applicationId: task.application_id,
    studentId: application.student_id,
    adminId: actor.adminId ?? null,
    action: completed ? "application_task_completed" : "application_task_reopened",
    message: completed
      ? `${actor.actorName} marked task "${task.title}" complete on application #${task.application_id}.`
      : `${actor.actorName} reopened task "${task.title}" on application #${task.application_id}.`,
  });

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", task.application_id);

  return { ok: true, applicationId: task.application_id };
}

async function loadApplicationCall(secret: SecretClient, callId: string) {
  const { data, error } = await secret
    .from("application_calls")
    .select("id, application_id, call_type, duration_minutes, call_date, status, outcome, summary")
    .eq("id", callId)
    .maybeSingle();

  if (error) {
    console.error("[application-calls] load call", error);
    return null;
  }

  return data;
}

export async function updateApplicationCallCore(
  secret: SecretClient,
  input: UpdateApplicationCallInput,
  actor: {
    actorName: string;
    adminId?: string | null;
  },
): Promise<CallsTasksActionResult & { applicationId?: number }> {
  const callId = parseApplicationCallId(input.callId);
  if (!callId) return { ok: false, error: "Invalid call." };

  const validated = validateCallFields(input);
  if (!validated.ok) return validated;

  const existing = await loadApplicationCall(secret, callId);
  if (!existing) return { ok: false, error: "Call not found." };

  const application = await loadApplicationStudentId(secret, existing.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_calls")
    .update({
      call_type: validated.data.callType,
      duration_minutes: validated.data.durationMinutes,
      call_date: validated.data.callDate,
      status: validated.data.status,
      outcome: validated.data.outcome,
      summary: validated.data.summary,
      updated_at: now,
    })
    .eq("id", callId);

  if (error) {
    console.error("[updateApplicationCallCore]", error);
    return { ok: false, error: "Could not update call." };
  }

  const typeLabel = APPLICATION_CALL_TYPE_LABEL[validated.data.callType];
  await insertApplicationCallsTasksActivityLog(secret, {
    applicationId: existing.application_id,
    studentId: application.student_id,
    adminId: actor.adminId ?? null,
    action: "application_call_updated",
    message: `${actor.actorName} updated ${typeLabel} on application #${existing.application_id}.`,
  });

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", existing.application_id);

  return { ok: true, applicationId: existing.application_id };
}

export async function updateApplicationCallStatusCore(
  secret: SecretClient,
  callIdRaw: string,
  statusRaw: string,
  actor: {
    actorName: string;
    adminId?: string | null;
  },
): Promise<CallsTasksActionResult & { applicationId?: number }> {
  const callId = parseApplicationCallId(callIdRaw);
  if (!callId) return { ok: false, error: "Invalid call." };

  if (!isApplicationCallStatus(statusRaw)) {
    return { ok: false, error: "Select a valid status." };
  }

  const existing = await loadApplicationCall(secret, callId);
  if (!existing) return { ok: false, error: "Call not found." };

  if (existing.status === statusRaw) {
    return { ok: true, applicationId: existing.application_id };
  }

  const application = await loadApplicationStudentId(secret, existing.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const outcome = callStatusRequiresOutcome(statusRaw)
    ? existing.outcome && isApplicationCallOutcome(existing.outcome)
      ? existing.outcome
      : null
    : null;

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_calls")
    .update({
      status: statusRaw,
      outcome,
      updated_at: now,
    })
    .eq("id", callId);

  if (error) {
    console.error("[updateApplicationCallStatusCore]", error);
    return { ok: false, error: "Could not update call status." };
  }

  await insertApplicationCallsTasksActivityLog(secret, {
    applicationId: existing.application_id,
    studentId: application.student_id,
    adminId: actor.adminId ?? null,
    action: "application_call_status_updated",
    message: `${actor.actorName} changed call status to ${statusRaw.replace("_", " ")} on application #${existing.application_id}.`,
  });

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", existing.application_id);

  return { ok: true, applicationId: existing.application_id };
}

export async function deleteApplicationCallCore(
  secret: SecretClient,
  callIdRaw: string,
  actor: {
    actorName: string;
    adminId?: string | null;
  },
): Promise<CallsTasksActionResult & { applicationId?: number }> {
  const callId = parseApplicationCallId(callIdRaw);
  if (!callId) return { ok: false, error: "Invalid call." };

  const existing = await loadApplicationCall(secret, callId);
  if (!existing) return { ok: false, error: "Call not found." };

  const application = await loadApplicationStudentId(secret, existing.application_id);
  if (!application) return { ok: false, error: "Application not found." };

  const typeLabel =
    isApplicationCallType(existing.call_type)
      ? APPLICATION_CALL_TYPE_LABEL[existing.call_type]
      : "call";

  const { error } = await secret.from("application_calls").delete().eq("id", callId);

  if (error) {
    console.error("[deleteApplicationCallCore]", error);
    return { ok: false, error: "Could not delete call." };
  }

  const now = new Date().toISOString();
  await insertApplicationCallsTasksActivityLog(secret, {
    applicationId: existing.application_id,
    studentId: application.student_id,
    adminId: actor.adminId ?? null,
    action: "application_call_deleted",
    message: `${actor.actorName} deleted ${typeLabel} from application #${existing.application_id}.`,
  });

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", existing.application_id);

  return { ok: true, applicationId: existing.application_id };
}
