import { NextResponse } from "next/server";
import type { Json } from "@/database.types";
import {
  fetchProgramCatalogForAi,
  fetchProgramsForEnrichment,
} from "@/lib/fetch-program-catalog-for-ai";
import type { ProgramCareerPath } from "@/lib/programs-discovery-types";
import {
  PROGRAM_FIT_TEST_QUESTION_IDS,
  type ProgramFitTestAnswers,
} from "@/lib/program-fit-test-steps";
import {
  extractOpenAiResponseUsage,
  logStudentAiUsageAndActivity,
  requireStudentSession,
} from "@/lib/student-ai-usage-log";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";
import { getProgramUniversityOfferings } from "@/app/(protected)/student/programs/_lib/get-program-university-offerings";
import { createSupabaseServerClient } from "@/utils/supabase-server";

const fallbackModel = "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 16_384;

type LlmRecommendation = {
  slug: string;
  rank: 1 | 2 | 3;
  hook: string;
  description: string;
  whyItFits: string[];
};

type LlmMatchResponse = {
  profileSummary: string;
  profileTags: string[];
  recommendations: LlmRecommendation[];
};

export type ProgramFitCareerRow = {
  title: string;
  signal: "high-demand" | "growing" | "high-salary" | null;
};

export type ProgramFitUniversityRow = {
  name: string;
  context: string;
  href: string;
};

export type ProgramFitRecommendation = {
  slug: string;
  rank: 1 | 2 | 3;
  rankLabel: string;
  title: string;
  category: string;
  tags: string[];
  href: string;
  hook: string;
  description: string;
  whyItFits: string[];
  careers: ProgramFitCareerRow[];
  universities: ProgramFitUniversityRow[];
};

export type ProgramFitMatchResponse = {
  profileSummary: string;
  profileTags: string[];
  recommendations: ProgramFitRecommendation[];
};

const PROGRAM_MATCHING_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "program_matching_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      profileSummary: { type: "string" },
      profileTags: {
        type: "array",
        items: { type: "string" },
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slug: { type: "string" },
            rank: { type: "integer", enum: [1, 2, 3] },
            hook: { type: "string" },
            description: { type: "string" },
            whyItFits: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["slug", "rank", "hook", "description", "whyItFits"],
          additionalProperties: false,
        },
      },
    },
    required: ["profileSummary", "profileTags", "recommendations"],
    additionalProperties: false,
  },
};

const RANK_LABELS_EN: Record<1 | 2 | 3, string> = {
  1: "Top recommendation for you",
  2: "Strong match",
  3: "Good alternative",
};

const RANK_LABELS_AR: Record<1 | 2 | 3, string> = {
  1: "أفضل توصية لك",
  2: "تطابق قوي",
  3: "بديل جيد",
};

function parseLocale(value: unknown): "en" | "ar" | undefined {
  if (value === "en" || value === "ar") return value;
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeAnswers(value: unknown): ProgramFitTestAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: ProgramFitTestAnswers = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "string" || typeof val === "number") {
      out[key] = val;
    } else if (Array.isArray(val)) {
      const arr = asStringArray(val);
      if (arr.length > 0) out[key] = arr;
    }
  }
  return out;
}

function validateAnswers(answers: ProgramFitTestAnswers): string[] {
  const missing: string[] = [];
  for (const qid of PROGRAM_FIT_TEST_QUESTION_IDS) {
    const val = answers[qid];
    if (val === undefined || val === null || val === "") {
      missing.push(qid);
      continue;
    }
    if (Array.isArray(val) && val.length === 0) {
      missing.push(qid);
    }
  }
  return missing;
}

function responseLanguageInstructions(locale: "en" | "ar" | undefined): string {
  if (locale === "ar") {
    return `
Language (required):
- Write profileSummary, each profileTags item, hook, description, and every whyItFits bullet in Modern Standard Arabic.
- Keep slug values exactly as provided in the catalog (Latin slug strings, unchanged).
- rank must remain exactly 1, 2, or 3.
`;
  }
  return `
Language:
- Write profileSummary, profileTags, hook, description, and whyItFits in clear English.
`;
}

function extractOutputText(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

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

function extractJsonObject(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function careerSignal(tag: string | undefined): ProgramFitCareerRow["signal"] {
  const normalized = (tag ?? "").trim().toLowerCase();
  if (normalized.includes("high demand") || normalized === "high-demand") {
    return "high-demand";
  }
  if (normalized.includes("growing")) return "growing";
  if (normalized.includes("salary") || normalized.includes("high-salary")) {
    return "high-salary";
  }
  return null;
}

function mapCareers(paths: ProgramCareerPath[]): ProgramFitCareerRow[] {
  return paths.slice(0, 4).map((path) => ({
    title: path.title,
    signal: careerSignal(path.tag),
  }));
}

async function enrichRecommendations(
  parsed: LlmMatchResponse,
  catalogSlugs: Set<string>,
  locale: "en" | "ar" | undefined,
): Promise<ProgramFitMatchResponse | { error: string }> {
  const slugs = parsed.recommendations.map((r) => r.slug.trim());
  const invalid = slugs.filter((slug) => !catalogSlugs.has(slug));
  if (invalid.length > 0) {
    return {
      error: `The AI returned unknown program slugs: ${invalid.join(", ")}. Please try again.`,
    };
  }

  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== 3) {
    return { error: "The AI must recommend exactly 3 distinct programs. Please try again." };
  }

  const enrichment = await fetchProgramsForEnrichment(slugs);
  const rankLabels = locale === "ar" ? RANK_LABELS_AR : RANK_LABELS_EN;

  const recommendations: ProgramFitRecommendation[] = [];
  for (const rec of parsed.recommendations) {
    const program = enrichment.get(rec.slug);
    if (!program) {
      return { error: `Program not found: ${rec.slug}` };
    }

    const offerings = await getProgramUniversityOfferings(rec.slug);
    const universities: ProgramFitUniversityRow[] = offerings.slice(0, 4).map((o) => ({
      name: o.name,
      context: o.rankingNote !== "—" ? o.rankingNote : o.countryName,
      href: o.detailHref,
    }));

    recommendations.push({
      slug: rec.slug,
      rank: rec.rank,
      rankLabel: rankLabels[rec.rank],
      title: program.title,
      category: program.category,
      tags: program.tags,
      href: `/student/programs/${rec.slug}`,
      hook: rec.hook,
      description: rec.description,
      whyItFits: asStringArray(rec.whyItFits).slice(0, 5),
      careers: mapCareers(program.career_paths),
      universities,
    });
  }

  recommendations.sort((a, b) => a.rank - b.rank);

  return {
    profileSummary: parsed.profileSummary,
    profileTags: asStringArray(parsed.profileTags).slice(0, 7),
    recommendations,
  };
}

export async function POST(request: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const featureEnabled = await isPlatformFeatureEnabledByKey("ai_program_matching");
  if (!featureEnabled) {
    return NextResponse.json({ error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE }, { status: 403 });
  }

  const { studentId } = auth;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to the server environment to enable AI program matching.",
      },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_MODEL ?? fallbackModel;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const answers = sanitizeAnswers(body.answers);
  if (!answers) {
    return NextResponse.json({ error: "Invalid answers." }, { status: 400 });
  }

  const invalid = validateAnswers(answers);
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "Missing or invalid answers.", fields: invalid },
      { status: 400 },
    );
  }

  const locale = parseLocale(body.locale);
  const labeledAnswers = body.labeledAnswers ?? answers;

  const catalog = await fetchProgramCatalogForAi();
  if (catalog.length < 3) {
    return NextResponse.json(
      { error: "Not enough active programs in the catalog to generate recommendations." },
      { status: 503 },
    );
  }

  const catalogSlugs = new Set(catalog.map((p) => p.slug));

  const prompt = `
You are Univeera's program fit advisor. Recommend exactly 3 university programs from the provided catalog only.
${responseLanguageInstructions(locale)}

Student questionnaire answers (human-readable labels where available):
${JSON.stringify(labeledAnswers, null, 2)}

Raw answer codes:
${JSON.stringify(answers, null, 2)}

Available programs catalog (you MUST pick slugs from this list only):
${JSON.stringify(catalog, null, 2)}

Return valid JSON with:
- profileSummary: 2-3 sentences about the student's profile, referencing their actual answers. You may use <strong> tags for emphasis.
- profileTags: 3-7 short trait tags
- recommendations: exactly 3 items with distinct slugs from the catalog, ranks 1 (best), 2, and 3
  - hook: one emotional opener sentence (italic tone)
  - description: outcome-focused paragraph about what they will study/do
  - whyItFits: 4-5 bullets that directly quote or reference the student's specific answer choices

Rules:
- slug must be an exact match from the catalog
- Do not invent programs, universities, or careers
- Do not include markdown outside JSON
- Each whyItFits bullet should feel personalized — reference what the student actually picked
`;

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        text: {
          format: PROGRAM_MATCHING_RESPONSE_FORMAT,
        },
      }),
    });

    const result = (await upstream.json()) as unknown;
    if (!upstream.ok) {
      const message =
        typeof result === "object" &&
        result &&
        typeof (result as { error?: { message?: unknown } }).error?.message === "string"
          ? (result as { error: { message: string } }).error.message
          : "The LLM request failed.";
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    const outputText = extractOutputText(result);
    if (!outputText) {
      return NextResponse.json({ error: "The LLM returned an empty response." }, { status: 502 });
    }

    let parsed: LlmMatchResponse;
    try {
      parsed = JSON.parse(extractJsonObject(outputText)) as LlmMatchResponse;
    } catch {
      return NextResponse.json(
        { error: "The AI response could not be parsed. Please try again." },
        { status: 502 },
      );
    }

    const enriched = await enrichRecommendations(parsed, catalogSlugs, locale);
    if ("error" in enriched) {
      return NextResponse.json({ error: enriched.error }, { status: 502 });
    }

    const usage = extractOpenAiResponseUsage(result);
    const outputsSummary: Json = {
      profileSummary: enriched.profileSummary?.slice(0, 4000) ?? "",
      profileTags: enriched.profileTags,
      recommendationCount: enriched.recommendations.length,
      recommendations: enriched.recommendations.map((r) => ({
        slug: r.slug,
        title: r.title,
        rank: r.rank,
      })),
    };

    await logStudentAiUsageAndActivity({
      studentId,
      type: "program_matching",
      model,
      usage,
      inputs: { answers, locale: locale ?? "en" } as Json,
      outputs: outputsSummary,
      activityLog: {
        entitiy_type: "ai_program_matching",
        entity_id: studentId,
        action: "ai_program_matching",
        message: `Generated AI program fit recommendations (${enriched.recommendations.length} programs).`,
      },
    });

    const supabase = await createSupabaseServerClient();
    await recordStudentPlatformCompletionOnce(
      supabase,
      studentId,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_program_fit_test,
    ).catch(() => {});

    return NextResponse.json(enriched);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate program recommendations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
