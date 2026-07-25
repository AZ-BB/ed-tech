import type { Json } from "@/database.types";
import {
  idsFromAgridPayload,
  logTranslationResponse,
  type TranslationLogContext,
} from "@/lib/translation/log-translation-response";

const DEFAULT_BASE_URL = "https://agrid-api.arabic.ai";

export type { TranslationLogContext };

export class AgridTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgridTranslationError";
  }
}

type AgridWorkflowResponse = {
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    status?: string;
    outputs?: {
      body?: string;
      text?: string;
    };
    error?: string;
    total_tokens?: number;
  };
};

type AgridOutputBody = {
  result?: string;
  session_id?: string;
};

function extractTranslatedText(payload: AgridWorkflowResponse): string | null {
  const outputs = payload.data?.outputs;
  if (!outputs) return null;

  const bodyRaw = outputs.body?.trim();
  if (bodyRaw) {
    try {
      const parsed = JSON.parse(bodyRaw) as AgridOutputBody;
      const result = parsed.result?.trim();
      if (result) return result;
    } catch {
      throw new AgridTranslationError("Translation API returned invalid outputs.body JSON.");
    }
  }

  const directText = outputs.text?.trim();
  return directText || null;
}

function buildRequestBody(text: string): Json {
  return {
    inputs: {
      text,
      source: "en",
      target: "ar",
    },
    response_mode: "blocking",
    user: "my_application",
  } as Json;
}

function logTranslationApiExchange(args: {
  requestBody?: Json;
  responseBody?: Json | null;
  httpStatus?: number | null;
  context?: TranslationLogContext;
}) {
  const scope = [
    args.context?.entityType,
    args.context?.entityId,
    args.context?.fieldKey,
  ]
    .filter(Boolean)
    .join(" / ");
  const prefix = scope ? `[agrid-translation] ${scope}` : "[agrid-translation]";

  if (args.requestBody !== undefined) {
    console.log(`${prefix} request body`, args.requestBody);
  }
  if (args.responseBody !== undefined) {
    console.log(`${prefix} response body`, args.responseBody, {
      httpStatus: args.httpStatus ?? null,
    });
  }
}

async function persistTranslationLog(args: {
  sourceText: string;
  translatedText?: string | null;
  requestBody: Json;
  responseBody?: Json | null;
  httpStatus?: number | null;
  workflowStatus?: string | null;
  taskId?: string | null;
  workflowRunId?: string | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
  context?: TranslationLogContext;
}) {
  await logTranslationResponse({
    sourceText: args.sourceText,
    translatedText: args.translatedText,
    requestBody: args.requestBody,
    responseBody: args.responseBody,
    httpStatus: args.httpStatus,
    workflowStatus: args.workflowStatus,
    taskId: args.taskId,
    workflowRunId: args.workflowRunId,
    totalTokens: args.totalTokens,
    errorMessage: args.errorMessage,
    context: args.context,
  });
}

export async function translateTextEnToAr(
  text: string,
  logContext?: TranslationLogContext,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AgridTranslationError("Cannot translate empty text.");
  }

  const apiKey = process.env.AGRID_API_KEY?.trim();
  if (!apiKey) {
    throw new AgridTranslationError("AGRID_API_KEY is not configured.");
  }

  const baseUrl = (process.env.AGRID_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );

  const requestBody = buildRequestBody(trimmed);
  logTranslationApiExchange({ requestBody, context: logContext });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logTranslationApiExchange({
      responseBody: { error: message },
      httpStatus: null,
      context: logContext,
    });
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      httpStatus: null,
      errorMessage: message,
      context: logContext,
    });
    throw new AgridTranslationError(message);
  }

  const responseText = await response.text().catch(() => "");
  let payload: AgridWorkflowResponse | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as AgridWorkflowResponse;
    } catch {
      payload = null;
    }
  }

  const ids = idsFromAgridPayload(payload);
  const responseBody = (payload ?? { raw: responseText || null }) as Json;

  logTranslationApiExchange({
    responseBody,
    httpStatus: response.status,
    context: logContext,
  });

  if (!response.ok) {
    const errorMessage = `Translation API failed (${response.status})${responseText ? `: ${responseText.slice(0, 200)}` : ""}`;
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      responseBody,
      httpStatus: response.status,
      workflowStatus: ids.workflowStatus,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      errorMessage,
      context: logContext,
    });
    throw new AgridTranslationError(errorMessage);
  }

  if (!payload) {
    const errorMessage = "Translation API returned a non-JSON response.";
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      responseBody,
      httpStatus: response.status,
      errorMessage,
      context: logContext,
    });
    throw new AgridTranslationError(errorMessage);
  }

  const status = payload.data?.status;
  if (status && status !== "succeeded") {
    const errorMessage =
      payload.data?.error?.trim() || `Translation workflow status: ${status}`;
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      responseBody: payload as Json,
      httpStatus: response.status,
      workflowStatus: status,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      errorMessage,
      context: logContext,
    });
    throw new AgridTranslationError(errorMessage);
  }

  let translated: string | null;
  try {
    translated = extractTranslatedText(payload);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Parse error";
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      responseBody: payload as Json,
      httpStatus: response.status,
      workflowStatus: status ?? ids.workflowStatus,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      errorMessage,
      context: logContext,
    });
    throw err;
  }

  if (!translated) {
    const errorMessage = "Translation API returned no translated result.";
    await persistTranslationLog({
      sourceText: trimmed,
      requestBody,
      responseBody: payload as Json,
      httpStatus: response.status,
      workflowStatus: status ?? ids.workflowStatus,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      errorMessage,
      context: logContext,
    });
    throw new AgridTranslationError(errorMessage);
  }

  await persistTranslationLog({
    sourceText: trimmed,
    translatedText: translated,
    requestBody,
    responseBody: payload as Json,
    httpStatus: response.status,
    workflowStatus: status ?? ids.workflowStatus,
    taskId: ids.taskId,
    workflowRunId: ids.workflowRunId,
    totalTokens: ids.totalTokens,
    context: logContext,
  });

  return translated;
}
