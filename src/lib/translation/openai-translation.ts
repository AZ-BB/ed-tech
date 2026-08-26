import type { Json } from "@/database.types";
import {
  idsFromOpenAiPayload,
  logTranslationResponse,
  type TranslationLogContext,
} from "@/lib/translation/log-translation-response";

const FALLBACK_MODEL = "gpt-5.6-luna";

export type { TranslationLogContext };

export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationError";
  }
}

export type UniversityTranslationFieldItem = {
  key: string;
  value: string;
};

export type UniversityTranslationPayload = {
  fields: UniversityTranslationFieldItem[];
  documents: string[];
};

export type UniversityTranslationResult = {
  fields: Record<string, string>;
  documents: string[];
};

export type CatalogNameItem = {
  id: string;
  name: string;
};

export type CatalogNamesTranslationResult = {
  /** id -> Arabic name */
  namesById: Record<string, string>;
};

const UNIVERSITY_CONTENT_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "university_content_translation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
          },
          required: ["key", "value"],
          additionalProperties: false,
        },
      },
      documents: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["fields", "documents"],
    additionalProperties: false,
  },
};

const CATALOG_NAMES_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "catalog_names_translation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
          required: ["id", "name"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

function extractOutputText(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct.trim() || undefined;

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return undefined;

  const chunks: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim() || undefined;
}

function buildTranslationPrompt(text: string): string {
  return `You are a professional translator for university catalog content.
Translate the following English text into Modern Standard Arabic (MSA).

Rules:
- Return ONLY the Arabic translation — no quotes, markdown fences, labels, or commentary.
- Preserve numbers, currency amounts, percentages, and formatting (line breaks, bullet-like structure) where sensible.
- Keep well-known proper nouns (university names, city names when commonly left in Latin script, acronyms like SAT/GPA/IELTS) in a natural Arabic academic style; transliterate or keep Latin as appropriate for admissions catalog copy.
- Do not add or omit meaning.

English text:
${text}`;
}

function buildStructuredUniversityPrompt(payload: UniversityTranslationPayload): string {
  return `You are a professional translator for university catalog content.
Translate every English string value in the JSON input into Modern Standard Arabic (MSA).

Rules:
- Return structured JSON matching the schema exactly (fields array + documents array).
- Preserve each field key exactly as given; only translate the value.
- Translate documents in the same order; return the same number of document strings as provided.
- Preserve numbers, currency amounts, percentages, and formatting (line breaks, bullet-like structure) where sensible.
- Keep well-known proper nouns (university names, city names when commonly left in Latin script, acronyms like SAT/GPA/IELTS) in a natural Arabic academic style; transliterate or keep Latin as appropriate for admissions catalog copy.
- Do not add or omit meaning.
- Do not add commentary outside the structured output.

Input JSON:
${JSON.stringify(payload, null, 2)}`;
}

function buildCatalogNamesPrompt(kind: "major" | "program", items: CatalogNameItem[]): string {
  const label = kind === "major" ? "university majors" : "university programs";
  return `You are a professional translator for university catalog content.
Translate each English ${label} name into Modern Standard Arabic (MSA).

Rules:
- Return structured JSON matching the schema exactly (items array).
- Preserve each item id exactly as given; only translate the name.
- Return one item per input id — same ids, same count.
- Keep well-known proper nouns and acronyms in a natural Arabic academic style; transliterate or keep Latin as appropriate for admissions catalog copy.
- Do not add or omit meaning.
- Do not add commentary outside the structured output.

Input JSON:
${JSON.stringify({ items }, null, 2)}`;
}

function buildTextRequestBody(text: string, model: string): Json {
  return {
    model,
    input: buildTranslationPrompt(text),
  } as Json;
}

function buildStructuredUniversityRequestBody(
  payload: UniversityTranslationPayload,
  model: string,
): Json {
  return {
    model,
    input: buildStructuredUniversityPrompt(payload),
    text: {
      format: UNIVERSITY_CONTENT_RESPONSE_FORMAT,
    },
  } as Json;
}

function buildCatalogNamesRequestBody(
  kind: "major" | "program",
  items: CatalogNameItem[],
  model: string,
): Json {
  return {
    model,
    input: buildCatalogNamesPrompt(kind, items),
    text: {
      format: CATALOG_NAMES_RESPONSE_FORMAT,
    },
  } as Json;
}

function logTranslationApiExchange(args: {
  requestBody?: Json;
  responseBody?: Json | null;
  httpStatus?: number | null;
  context?: TranslationLogContext;
}) {
  if (process.env.TRANSLATION_DEBUG !== "1") return;

  const scope = [
    args.context?.entityType,
    args.context?.entityId,
    args.context?.fieldKey,
  ]
    .filter(Boolean)
    .join(" / ");
  const prefix = scope ? `[openai-translation] ${scope}` : "[openai-translation]";

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
  inputTokens?: number | null;
  outputTokens?: number | null;
  model?: string | null;
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
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    model: args.model,
    errorMessage: args.errorMessage,
    context: args.context,
  });
}

type OpenAiCallResult = {
  model: string;
  requestBody: Json;
  responseBody: Json;
  httpStatus: number;
  ids: ReturnType<typeof idsFromOpenAiPayload>;
  payload: unknown;
  outputText: string | null;
};

async function callOpenAiResponses(args: {
  requestBody: Json;
  sourceText: string;
  context?: TranslationLogContext;
}): Promise<OpenAiCallResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new TranslationError("OPENAI_API_KEY is not configured.");
  }

  const model =
    typeof (args.requestBody as { model?: unknown }).model === "string"
      ? ((args.requestBody as { model: string }).model)
      : process.env.OPENAI_TRANSLATION_MODEL?.trim() || FALLBACK_MODEL;

  logTranslationApiExchange({ requestBody: args.requestBody, context: args.context });

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args.requestBody),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logTranslationApiExchange({
      responseBody: { error: message },
      httpStatus: null,
      context: args.context,
    });
    await persistTranslationLog({
      sourceText: args.sourceText,
      requestBody: args.requestBody,
      httpStatus: null,
      model,
      errorMessage: message,
      context: args.context,
    });
    throw new TranslationError(message);
  }

  const responseText = await response.text().catch(() => "");
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      payload = null;
    }
  }

  const ids = idsFromOpenAiPayload(payload);
  const responseBody = (payload ?? { raw: responseText || null }) as Json;

  logTranslationApiExchange({
    responseBody,
    httpStatus: response.status,
    context: args.context,
  });

  if (!response.ok) {
    const apiMessage =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
        ? (payload as { error: { message: string } }).error.message
        : null;
    const errorMessage =
      apiMessage ||
      `Translation API failed (${response.status})${responseText ? `: ${responseText.slice(0, 200)}` : ""}`;
    await persistTranslationLog({
      sourceText: args.sourceText,
      requestBody: args.requestBody,
      responseBody,
      httpStatus: response.status,
      workflowStatus: ids.workflowStatus,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      inputTokens: ids.inputTokens,
      outputTokens: ids.outputTokens,
      model,
      errorMessage,
      context: args.context,
    });
    throw new TranslationError(errorMessage);
  }

  if (!payload) {
    const errorMessage = "Translation API returned a non-JSON response.";
    await persistTranslationLog({
      sourceText: args.sourceText,
      requestBody: args.requestBody,
      responseBody,
      httpStatus: response.status,
      model,
      errorMessage,
      context: args.context,
    });
    throw new TranslationError(errorMessage);
  }

  const status = ids.workflowStatus;
  if (status && status !== "completed" && status !== "succeeded") {
    const errorObj = (payload as { error?: { message?: string } | string | null }).error;
    const errorMessage =
      (typeof errorObj === "object" && errorObj?.message?.trim()) ||
      (typeof errorObj === "string" ? errorObj.trim() : "") ||
      `Translation response status: ${status}`;
    await persistTranslationLog({
      sourceText: args.sourceText,
      requestBody: args.requestBody,
      responseBody: payload as Json,
      httpStatus: response.status,
      workflowStatus: status,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      inputTokens: ids.inputTokens,
      outputTokens: ids.outputTokens,
      model,
      errorMessage,
      context: args.context,
    });
    throw new TranslationError(errorMessage);
  }

  const outputText = extractOutputText(payload)?.trim() || null;
  if (!outputText) {
    const errorMessage = "Translation API returned no translated result.";
    await persistTranslationLog({
      sourceText: args.sourceText,
      requestBody: args.requestBody,
      responseBody: payload as Json,
      httpStatus: response.status,
      workflowStatus: status,
      taskId: ids.taskId,
      workflowRunId: ids.workflowRunId,
      totalTokens: ids.totalTokens,
      inputTokens: ids.inputTokens,
      outputTokens: ids.outputTokens,
      model,
      errorMessage,
      context: args.context,
    });
    throw new TranslationError(errorMessage);
  }

  return {
    model,
    requestBody: args.requestBody,
    responseBody: payload as Json,
    httpStatus: response.status,
    ids,
    payload,
    outputText,
  };
}

function parseUniversityTranslationResult(
  raw: unknown,
  expectedDocumentCount: number,
): UniversityTranslationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TranslationError("Translation API returned invalid structured output.");
  }

  const obj = raw as { fields?: unknown; documents?: unknown };
  if (!Array.isArray(obj.fields) || !Array.isArray(obj.documents)) {
    throw new TranslationError("Translation API returned incomplete structured output.");
  }

  const fields: Record<string, string> = {};
  for (const item of obj.fields) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const key = typeof (item as { key?: unknown }).key === "string"
      ? (item as { key: string }).key.trim()
      : "";
    const value = typeof (item as { value?: unknown }).value === "string"
      ? (item as { value: string }).value.trim()
      : "";
    if (!key || !value) continue;
    fields[key] = value;
  }

  const documents = obj.documents
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (expectedDocumentCount > 0 && documents.length !== expectedDocumentCount) {
    throw new TranslationError(
      `Translation API returned ${documents.length} documents; expected ${expectedDocumentCount}.`,
    );
  }

  return { fields, documents };
}

export async function translateTextEnToAr(
  text: string,
  logContext?: TranslationLogContext,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new TranslationError("Cannot translate empty text.");
  }

  const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || FALLBACK_MODEL;
  const requestBody = buildTextRequestBody(trimmed, model);
  const result = await callOpenAiResponses({
    requestBody,
    sourceText: trimmed,
    context: logContext,
  });

  await persistTranslationLog({
    sourceText: trimmed,
    translatedText: result.outputText,
    requestBody: result.requestBody,
    responseBody: result.responseBody,
    httpStatus: result.httpStatus,
    workflowStatus: result.ids.workflowStatus,
    taskId: result.ids.taskId,
    workflowRunId: result.ids.workflowRunId,
    totalTokens: result.ids.totalTokens,
    inputTokens: result.ids.inputTokens,
    outputTokens: result.ids.outputTokens,
    model: result.model,
    context: logContext,
  });

  return result.outputText!;
}

export async function translateUniversityContentEnToAr(
  payload: UniversityTranslationPayload,
  logContext?: TranslationLogContext,
): Promise<UniversityTranslationResult> {
  const fields = payload.fields
    .map((item) => ({
      key: item.key.trim(),
      value: item.value.trim(),
    }))
    .filter((item) => item.key && item.value);
  const documents = payload.documents.map((line) => line.trim()).filter(Boolean);

  if (fields.length === 0 && documents.length === 0) {
    throw new TranslationError("Cannot translate empty university content.");
  }

  const inputPayload: UniversityTranslationPayload = { fields, documents };
  const sourceText = JSON.stringify(inputPayload);
  const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || FALLBACK_MODEL;
  const context: TranslationLogContext = {
    ...logContext,
    fieldKey: logContext?.fieldKey ?? "content",
  };
  const requestBody = buildStructuredUniversityRequestBody(inputPayload, model);

  const result = await callOpenAiResponses({
    requestBody,
    sourceText,
    context,
  });

  let parsed: UniversityTranslationResult;
  try {
    parsed = parseUniversityTranslationResult(
      JSON.parse(result.outputText!) as unknown,
      documents.length,
    );
  } catch (err) {
    const message =
      err instanceof TranslationError
        ? err.message
        : "Translation API returned unparseable structured output.";
    await persistTranslationLog({
      sourceText,
      requestBody: result.requestBody,
      responseBody: result.responseBody,
      httpStatus: result.httpStatus,
      workflowStatus: result.ids.workflowStatus,
      taskId: result.ids.taskId,
      workflowRunId: result.ids.workflowRunId,
      totalTokens: result.ids.totalTokens,
      inputTokens: result.ids.inputTokens,
      outputTokens: result.ids.outputTokens,
      model: result.model,
      errorMessage: message,
      context,
    });
    throw new TranslationError(message);
  }

  for (const field of fields) {
    if (!parsed.fields[field.key]?.trim()) {
      const message = `Translation API missing Arabic value for field "${field.key}".`;
      await persistTranslationLog({
        sourceText,
        translatedText: JSON.stringify(parsed),
        requestBody: result.requestBody,
        responseBody: result.responseBody,
        httpStatus: result.httpStatus,
        workflowStatus: result.ids.workflowStatus,
        taskId: result.ids.taskId,
        workflowRunId: result.ids.workflowRunId,
        totalTokens: result.ids.totalTokens,
        inputTokens: result.ids.inputTokens,
        outputTokens: result.ids.outputTokens,
        model: result.model,
        errorMessage: message,
        context,
      });
      throw new TranslationError(message);
    }
  }

  await persistTranslationLog({
    sourceText,
    translatedText: JSON.stringify(parsed),
    requestBody: result.requestBody,
    responseBody: result.responseBody,
    httpStatus: result.httpStatus,
    workflowStatus: result.ids.workflowStatus,
    taskId: result.ids.taskId,
    workflowRunId: result.ids.workflowRunId,
    totalTokens: result.ids.totalTokens,
    inputTokens: result.ids.inputTokens,
    outputTokens: result.ids.outputTokens,
    model: result.model,
    context,
  });

  return parsed;
}

function parseCatalogNamesResult(
  raw: unknown,
  expectedIds: Set<string>,
): CatalogNamesTranslationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TranslationError("Translation API returned invalid catalog structured output.");
  }

  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw new TranslationError("Translation API returned incomplete catalog structured output.");
  }

  const namesById: Record<string, string> = {};
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id =
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id.trim()
        : "";
    const name =
      typeof (item as { name?: unknown }).name === "string"
        ? (item as { name: string }).name.trim()
        : "";
    if (!id || !name) continue;
    namesById[id] = name;
  }

  for (const id of expectedIds) {
    if (!namesById[id]?.trim()) {
      throw new TranslationError(`Translation API missing Arabic name for id "${id}".`);
    }
  }

  return { namesById };
}

/**
 * Translate many major or program names in a single structured OpenAI call.
 * Logs entity_id as a comma-separated list of ids.
 */
export async function translateCatalogNamesEnToAr(
  kind: "major" | "program",
  items: CatalogNameItem[],
  logContext?: TranslationLogContext,
): Promise<CatalogNamesTranslationResult> {
  const normalized = items
    .map((item) => ({
      id: String(item.id).trim(),
      name: item.name.trim(),
    }))
    .filter((item) => item.id && item.name);

  if (normalized.length === 0) {
    return { namesById: {} };
  }

  const entityIdCsv = normalized.map((item) => item.id).join(",");
  const sourceText = JSON.stringify({ items: normalized });
  const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || FALLBACK_MODEL;
  const context: TranslationLogContext = {
    ...logContext,
    entityType: kind === "major" ? "majors" : "programs",
    entityId: entityIdCsv,
    fieldKey: logContext?.fieldKey ?? "names",
  };
  const requestBody = buildCatalogNamesRequestBody(kind, normalized, model);

  const result = await callOpenAiResponses({
    requestBody,
    sourceText,
    context,
  });

  let parsed: CatalogNamesTranslationResult;
  try {
    parsed = parseCatalogNamesResult(
      JSON.parse(result.outputText!) as unknown,
      new Set(normalized.map((item) => item.id)),
    );
  } catch (err) {
    const message =
      err instanceof TranslationError
        ? err.message
        : "Translation API returned unparseable catalog structured output.";
    await persistTranslationLog({
      sourceText,
      requestBody: result.requestBody,
      responseBody: result.responseBody,
      httpStatus: result.httpStatus,
      workflowStatus: result.ids.workflowStatus,
      taskId: result.ids.taskId,
      workflowRunId: result.ids.workflowRunId,
      totalTokens: result.ids.totalTokens,
      inputTokens: result.ids.inputTokens,
      outputTokens: result.ids.outputTokens,
      model: result.model,
      errorMessage: message,
      context,
    });
    throw new TranslationError(message);
  }

  await persistTranslationLog({
    sourceText,
    translatedText: JSON.stringify(parsed),
    requestBody: result.requestBody,
    responseBody: result.responseBody,
    httpStatus: result.httpStatus,
    workflowStatus: result.ids.workflowStatus,
    taskId: result.ids.taskId,
    workflowRunId: result.ids.workflowRunId,
    totalTokens: result.ids.totalTokens,
    inputTokens: result.ids.inputTokens,
    outputTokens: result.ids.outputTokens,
    model: result.model,
    context,
  });

  return parsed;
}
