import type { Database, Json } from "@/database.types";
import { createClient } from "@supabase/supabase-js";

export type TranslationLogContext = {
  entityType?: string;
  entityId?: string;
  fieldKey?: string;
  requestedBy?: string;
  requestId?: string;
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
  inputTokens?: number | null;
  outputTokens?: number | null;
  model?: string | null;
  errorMessage?: string | null;
  context?: TranslationLogContext;
};

type OpenAiResponsePayload = {
  id?: string;
  status?: string;
  error?: { message?: string } | string | null;
};

function extractOpenAiResponseUsage(result: unknown): {
  total: number;
  input: number;
  output: number;
} {
  if (!result || typeof result !== "object") {
    return { total: 0, input: 0, output: 0 };
  }
  const usage = (result as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") {
    return { total: 0, input: 0, output: 0 };
  }
  const totalRaw = usage.total_tokens;
  const inputRaw = usage.input_tokens;
  const outputRaw = usage.output_tokens;
  const input = typeof inputRaw === "number" ? inputRaw : 0;
  const output = typeof outputRaw === "number" ? outputRaw : 0;
  const total =
    typeof totalRaw === "number" && Number.isFinite(totalRaw)
      ? totalRaw
      : input + output;
  return { total: Math.max(0, Math.round(total)), input, output };
}

function createTranslationLogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient<Database>(url, key);
}

export async function logTranslationResponse(record: TranslationLogRecord): Promise<void> {
  try {
    const supabase = createTranslationLogClient();
    const entityId =
      record.context?.entityId == null
        ? null
        : String(record.context.entityId).trim() || null;
    const requestId =
      record.context?.requestId == null
        ? null
        : String(record.context.requestId).trim() || null;
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
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      model: record.model?.trim() || null,
      error_message: record.errorMessage ?? null,
      entity_type: record.context?.entityType ?? null,
      entity_id: entityId,
      field_key: record.context?.fieldKey ?? null,
      requested_by: record.context?.requestedBy ?? null,
      request_id: requestId,
    });

    if (error) {
      console.error("[translation-responses] insert failed", error);
    }
  } catch (err) {
    console.error("[translation-responses] insert threw", err);
  }
}

export function idsFromOpenAiPayload(payload: unknown): {
  taskId: string | null;
  workflowRunId: string | null;
  workflowStatus: string | null;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
} {
  if (!payload || typeof payload !== "object") {
    return {
      taskId: null,
      workflowRunId: null,
      workflowStatus: null,
      totalTokens: null,
      inputTokens: null,
      outputTokens: null,
    };
  }

  const p = payload as OpenAiResponsePayload;
  const usage = extractOpenAiResponseUsage(payload);
  return {
    taskId: typeof p.id === "string" ? p.id.trim() || null : null,
    workflowRunId: null,
    workflowStatus: typeof p.status === "string" ? p.status.trim() || null : null,
    totalTokens: usage.total > 0 ? usage.total : null,
    inputTokens: usage.input > 0 ? usage.input : null,
    outputTokens: usage.output > 0 ? usage.output : null,
  };
}
