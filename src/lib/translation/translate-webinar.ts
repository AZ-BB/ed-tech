import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  buildTranslatableWebinarFields,
  getWebinarAgendaLines,
  getWebinarTags,
  listFieldValue,
  listFromFieldValue,
  parseWebinarContentAr,
  parseWebinarContentArMeta,
  serializeWebinarContentAr,
  serializeWebinarContentArMeta,
  webinarListSourceHash,
  type WebinarContentArKey,
  type WebinarContentArScalarKey,
  type WebinarSourceRow,
} from "@/lib/webinar-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

export type TranslateWebinarResult =
  | { ok: true; translatedCount: number; errors: string[]; webinarTitle: string }
  | { ok: false; error: string; webinarTitle?: string };

export type TranslateWebinarOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateWebinarById(
  supabase: DbClient,
  webinarId: number,
  options: TranslateWebinarOptions = {},
): Promise<TranslateWebinarResult> {
  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "webinar",
    entityId: String(webinarId),
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: webinar, error } = await supabase
    .from("webinars")
    .select(
      `
      id,
      title,
      description,
      format,
      tags,
      agenda,
      host_name,
      host_title,
      host_bio,
      host_image_url,
      content_ar,
      content_ar_meta,
      advisors (
        first_name,
        last_name,
        title,
        description,
        about,
        avatar_url
      )
    `,
    )
    .eq("id", webinarId)
    .maybeSingle();

  if (error || !webinar) {
    if (error) console.error("[translate-webinar] fetch", error);
    return { ok: false, error: "Webinar not found." };
  }

  const webinarTitle = webinar.title?.trim() || String(webinarId);
  const advisor = Array.isArray(webinar.advisors) ? webinar.advisors[0] : webinar.advisors;

  const row: WebinarSourceRow = {
    title: webinar.title,
    description: webinar.description,
    format: webinar.format,
    tags: webinar.tags,
    agenda: webinar.agenda,
    host_name: webinar.host_name,
    host_title: webinar.host_title,
    host_bio: webinar.host_bio,
    host_image_url: webinar.host_image_url,
    advisors: advisor ?? null,
  };

  const fields = buildTranslatableWebinarFields(row);
  const tags = getWebinarTags(row);
  const agenda = getWebinarAgendaLines(row);

  if (fields.length === 0 && tags.length === 0 && agenda.length === 0) {
    return {
      ok: false,
      error: "No translatable English content found for this webinar.",
      webinarTitle,
    };
  }

  const existingContent = parseWebinarContentAr(webinar.content_ar);
  const existingMeta = parseWebinarContentArMeta(webinar.content_ar_meta);
  const nextContent = { ...existingContent };
  const fieldHashes: Partial<Record<WebinarContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate: {
    key: WebinarContentArScalarKey;
    sourceText: string;
    sourceHash: string;
  }[] = [...fields];

  const apiFields: { key: string; value: string }[] = fieldsToTranslate.map((field) => ({
    key: field.key,
    value: field.sourceText,
  }));

  if (tags.length > 0) {
    apiFields.push({ key: "tags", value: listFieldValue(tags) });
  }
  if (agenda.length > 0) {
    apiFields.push({ key: "agenda", value: listFieldValue(agenda) });
  }

  if (apiFields.length > 0) {
    try {
      const translated = await translateUniversityContentEnToAr(
        { fields: apiFields, documents: [] },
        {
          ...logContext,
          fieldKey: "content",
        },
      );

      for (const field of fieldsToTranslate) {
        const value = translated.fields[field.key]?.trim();
        if (!value) {
          errors.push(`${field.key}: Missing Arabic translation.`);
          continue;
        }
        nextContent[field.key] = value;
        fieldHashes[field.key] = field.sourceHash;
        translatedCount += 1;
      }

      if (tags.length > 0) {
        const tagValue = translated.fields.tags?.trim();
        if (tagValue) {
          const parsed = listFromFieldValue(tagValue);
          if (parsed.length === tags.length) {
            nextContent.tags = parsed;
            fieldHashes.tags = webinarListSourceHash(tags);
            translatedCount += parsed.length;
          } else {
            errors.push(`tags: Expected ${tags.length} translations, got ${parsed.length}.`);
          }
        } else {
          errors.push("tags: Missing Arabic translation.");
        }
      }

      if (agenda.length > 0) {
        const agendaValue = translated.fields.agenda?.trim();
        if (agendaValue) {
          const parsed = listFromFieldValue(agendaValue);
          if (parsed.length === agenda.length) {
            nextContent.agenda = parsed;
            fieldHashes.agenda = webinarListSourceHash(agenda);
            translatedCount += parsed.length;
          } else {
            errors.push(
              `agenda: Expected ${agenda.length} translations, got ${parsed.length}.`,
            );
          }
        } else {
          errors.push("agenda: Missing Arabic translation.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`content: ${message}`);
      console.error("[translate-webinar] content", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      webinarTitle,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("webinars")
      .update({
        content_ar: serializeWebinarContentAr(nextContent),
        content_ar_meta: serializeWebinarContentArMeta(meta),
      })
      .eq("id", webinarId);

    if (updateError) {
      console.error("[translate-webinar] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        webinarTitle,
      };
    }
  }

  return { ok: true, translatedCount, errors, webinarTitle };
}
