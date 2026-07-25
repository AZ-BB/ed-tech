import type { Json } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type TranslationLogContext = {
  entityType?: string;
  entityId?: string;
  fieldKey?: string;
  requestedBy?: string;
};

export type TranslationLogRecord = {
  sourceText: string;
  translatedText?: string | null;
  sourceLang?: string;
  targetLang?: string;
  requestBody: Json;
  responseBody?: Json | null;
  httpStatus?: number | null;
  workflowStatus?: string | null;
  taskId?: string | null;
  workflowRunId?: string | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
  context?: TranslationLogContext;
};

type AgridWorkflowPayload = {
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    status?: string;
    error?: string;
    total_tokens?: number;
  };
};

function parseTotalTokens(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export async function logTranslationResponse(record: TranslationLogRecord): Promise<void> {
  try {
    const supabase = await createSupabaseSecretClient();
    const { error } = await supabase.from("translation_responses").insert({
      source_text: record.sourceText,
      translated_text: record.translatedText ?? null,
      source_lang: record.sourceLang ?? "en",
      target_lang: record.targetLang ?? "ar",
      request_body: record.requestBody,
      response_body: record.responseBody ?? null,
      http_status: record.httpStatus ?? null,
      workflow_status: record.workflowStatus ?? null,
      task_id: record.taskId ?? null,
      workflow_run_id: record.workflowRunId ?? null,
      total_tokens: record.totalTokens ?? null,
      error_message: record.errorMessage ?? null,
      entity_type: record.context?.entityType ?? null,
      entity_id: record.context?.entityId ?? null,
      field_key: record.context?.fieldKey ?? null,
      requested_by: record.context?.requestedBy ?? null,
    });

    if (error) {
      console.error("[translation-responses] insert failed", error);
    }
  } catch (err) {
    console.error("[translation-responses] insert threw", err);
  }
}

export function idsFromAgridPayload(payload: unknown): {
  taskId: string | null;
  workflowRunId: string | null;
  workflowStatus: string | null;
  totalTokens: number | null;
} {
  if (!payload || typeof payload !== "object") {
    return { taskId: null, workflowRunId: null, workflowStatus: null, totalTokens: null };
  }

  const p = payload as AgridWorkflowPayload;
  return {
    taskId: p.task_id?.trim() || null,
    workflowRunId: p.workflow_run_id?.trim() || null,
    workflowStatus: p.data?.status?.trim() || null,
    totalTokens: parseTotalTokens(p.data?.total_tokens),
  };
}
