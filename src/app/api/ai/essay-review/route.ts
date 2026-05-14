import { NextResponse } from "next/server";
import type { EssayReviewFeedback, EssayReviewStats } from "@/app/(protected)/student/essay-review/_lib/essay-review-types";
import type { Json } from "@/database.types";
import {
  extractOpenAiResponseUsage,
  logStudentAiUsageAndActivity,
  requireStudentSession,
} from "@/lib/student-ai-usage-log";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

const fallbackModel = "gpt-4.1-mini";

function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

function computeEssayStats(text: string, scoreFromModel: number | undefined): EssayReviewStats {
  const trimmed = text.trim();
  const words = wordCount(trimmed);
  const sentenceParts = trimmed.replace(/([.!?])\s+/g, "$1|").split("|");
  const sentences = sentenceParts.filter((s) => s.trim().length > 10).length;
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 20).length;
  const avgSentLen = sentences > 0 ? Math.round(words / sentences) : 0;
  const score =
    typeof scoreFromModel === "number" && Number.isFinite(scoreFromModel)
      ? Math.max(0, Math.min(100, Math.round(scoreFromModel)))
      : 0;
  return { words, sentences, paragraphs, avgSentLen, score };
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

function safeJsonParse(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLlmFeedback(raw: Record<string, unknown>): Omit<
  EssayReviewFeedback,
  "_stats"
> & { overallScore?: number } {
  const structureRaw = raw.structure;
  const structure: EssayReviewFeedback["structure"] = [];
  if (Array.isArray(structureRaw)) {
    for (const row of structureRaw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      structure.push({
        section: asString(o.section),
        rating: asString(o.rating),
        note: asString(o.note),
      });
    }
  }

  const suggestionsRaw = raw.suggestions;
  const suggestions: EssayReviewFeedback["suggestions"] = [];
  if (Array.isArray(suggestionsRaw)) {
    for (const row of suggestionsRaw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      suggestions.push({
        original: asString(o.original),
        improved: asString(o.improved),
        reason: asString(o.reason),
      });
    }
  }

  const qualityRaw = raw.quality;
  const quality: EssayReviewFeedback["quality"] = [];
  if (Array.isArray(qualityRaw)) {
    for (const row of qualityRaw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      quality.push({
        name: asString(o.name),
        rating: asString(o.rating),
        tip: asString(o.tip),
      });
    }
  }

  const auth = raw.authenticity;
  let authenticity: EssayReviewFeedback["authenticity"] = {
    assessment: "",
    flags: [],
  };
  if (auth && typeof auth === "object") {
    const a = auth as Record<string, unknown>;
    authenticity = {
      assessment: asString(a.assessment),
      flags: asStringArray(a.flags),
    };
  }

  const overallScore = raw.overallScore;
  const scoreNum =
    typeof overallScore === "number"
      ? overallScore
      : typeof overallScore === "string"
        ? Number(overallScore)
        : undefined;

  return {
    is_valid_essay: Boolean(raw.is_valid_essay),
    invalid_reason: asString(raw.invalid_reason) || undefined,
    assessment: asString(raw.assessment),
    structure,
    strengths: asStringArray(raw.strengths),
    improvements: asStringArray(raw.improvements),
    suggestions,
    quality,
    authenticity,
    recommendation: asString(raw.recommendation),
    overallScore: Number.isFinite(scoreNum) ? scoreNum : undefined,
  };
}

export async function POST(request: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const { studentId } = auth;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to the server environment to enable essay review.",
      },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_MODEL ?? fallbackModel;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const essayText = asString(o.essayText);
  const essayPrompt = asString(o.essayPrompt);
  const university = asString(o.university);

  if (!essayText) {
    return NextResponse.json({ error: "Essay text is required." }, { status: 400 });
  }

  if (essayText.length > 50_000) {
    return NextResponse.json(
      { error: "Essay is too long. Please shorten to under 50,000 characters." },
      { status: 400 },
    );
  }

  const wc = wordCount(essayText);
  if (wc < 150) {
    return NextResponse.json(
      { error: "Please write at least 150 words for a meaningful review." },
      { status: 400 },
    );
  }

  const contextLines = [
    essayPrompt ? `Essay prompt (from student):\n${essayPrompt}` : "Essay prompt: (not provided)",
    university ? `Target university (from student):\n${university}` : "Target university: (not provided)",
    "\n--- ESSAY ---\n",
    essayText,
  ].join("\n\n");

  const prompt = `You are Univeera's admissions essay coach. Read the student's application essay and optional context, then return ONLY valid JSON (no markdown fences, no commentary outside JSON).

${contextLines}

Return a JSON object with exactly this shape and rules:
{
  "is_valid_essay": boolean,
  "invalid_reason": "string — only if is_valid_essay is false; explain briefly (e.g. empty, not prose, wrong language)",
  "overallScore": number from 0-100 reflecting overall competitiveness and quality as a university application essay,
  "assessment": "3-5 sentences: holistic overview of how the essay reads for admissions",
  "structure": [
    { "section": "Opening" | "Body" | "Conclusion", "rating": "Strong" | "Good" | "Adequate" | "Needs improvement", "note": "2-4 sentences of specific feedback for that section" }
  ],
  "strengths": ["up to 4 concrete strengths tied to this draft"],
  "improvements": ["up to 5 prioritized improvements"],
  "suggestions": [
    { "original": "exact or near-exact sentence from the student's essay", "improved": "your rewritten sentence", "reason": "one sentence why the change helps" }
  ],
  "quality": [
    { "name": "Clarity & coherence", "rating": "Strong" | "Good" | "Adequate" | "Needs improvement", "tip": "short definition for UI tooltip" },
    { "name": "Specificity & evidence", "rating": "...", "tip": "..." },
    { "name": "Grammar & language", "rating": "...", "tip": "..." },
    { "name": "Prompt relevance", "rating": "...", "tip": "..." }
  ],
  "authenticity": {
    "assessment": "2-4 sentences on voice and authenticity",
    "flags": ["2-5 bullet observations, e.g. cliches spotted or genuine detail"]
  },
  "recommendation": "1 short paragraph: single most important next step for revision"
}

Rules:
- If the text is not a genuine application essay (gibberish, list of keywords, mostly non-English without context), set is_valid_essay to false and fill invalid_reason; other fields may be empty strings or empty arrays.
- suggestions: include exactly 3 items when is_valid_essay is true; original must be taken from the student's essay when possible.
- Be honest and constructive; avoid generic praise. Reference the prompt and university when provided.
- Ratings must use exactly the four strings listed (title case as shown).
- Do not include markdown, comments, or text outside the JSON object.`;

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
      return NextResponse.json(
        { error: "The LLM returned an empty response." },
        { status: 502 },
      );
    }

    const parsed = safeJsonParse(outputText);
    const partial = parseLlmFeedback(parsed);
    const _stats = computeEssayStats(essayText, partial.overallScore);

    const feedback: EssayReviewFeedback = {
      is_valid_essay: partial.is_valid_essay,
      invalid_reason: partial.invalid_reason,
      assessment: partial.assessment,
      structure: partial.structure,
      strengths: partial.strengths,
      improvements: partial.improvements,
      suggestions: partial.suggestions,
      quality: partial.quality,
      authenticity: partial.authenticity,
      recommendation: partial.recommendation,
      _stats,
    };

    const usage = extractOpenAiResponseUsage(result);
    const inputsSummary: Json = {
      essayWordCount: wc,
      essayCharCount: essayText.length,
      essayPrompt: essayPrompt.slice(0, 2000),
      university: university.slice(0, 500),
      essayExcerpt: essayText.slice(0, 4000),
    };
    const outputsSummary: Json = {
      is_valid_essay: feedback.is_valid_essay,
      invalid_reason: feedback.invalid_reason ?? null,
      overallScore: feedback._stats.score,
      stats: feedback._stats,
      assessment: feedback.assessment.slice(0, 4000),
      structure: feedback.structure,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      suggestionCount: feedback.suggestions.length,
      quality: feedback.quality,
      authenticity: feedback.authenticity,
      recommendation: feedback.recommendation.slice(0, 2000),
    };
    const activityMessage = feedback.is_valid_essay
      ? `Completed AI essay review (${wc} words, score ${feedback._stats.score}/100).`
      : `AI essay review could not treat submission as an essay: ${(feedback.invalid_reason ?? "unspecified").slice(0, 240)}`;

    void logStudentAiUsageAndActivity({
      studentId,
      type: "essay_review",
      model,
      usage,
      inputs: inputsSummary,
      outputs: outputsSummary,
      activityLog: {
        entitiy_type: "essay_review",
        entity_id: studentId,
        action: "essay_review",
        message: activityMessage,
      },
    });

    createSupabaseServerClient().then((supabase) =>
      recordStudentPlatformCompletionOnce(
        supabase,
        studentId,
        STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_essay_review,
      ).catch(() => {}),
    );

    return NextResponse.json(feedback);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete essay review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
