import { NextResponse } from "next/server";
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
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";
import {
  buildAiDailyLimitExceededPayload,
  checkStudentAiDailyLimit,
} from "@/lib/student-ai-daily-limit";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type StudentMatchingPayload = {
  fullName: string;
  schoolName: string;
  schoolCountry: string;
  nationality: string;
  academicSystem: string;
  predictedScore: string;
  testsTaken: string[];
  testScoreNotes: string;
  primaryStudyDestination: string;
  degreeLevel: string;
  intendedMajor: string;
  excites: string[];
  strongestSubjects: string[];
  campusEnvironment: string;
  mattersMost: string[];
  outsideActivities: string[];
  academicAmbition: string;
  goalAfterUniversity: string;
  workLocationPreference: string;
  budgetBand: string;
  extraNotes?: string;
  /** UI locale — controls response language from the model. */
  locale?: "en" | "ar";
};

type UniversityMatch = {
  universityName: string;
  programName: string;
  city: string;
  country: string;
  tuitionEstimate: string;
  admissionFit: "Reach" | "Target" | "Likely";
  whyItMatches: string[];
  considerations: string;
  nextSteps: string[];
  sourceUrl: string;
};

type MatchResponse = {
  profileSummary: string;
  recommendedStrategy: string[];
  matches: UniversityMatch[];
};

const UNIVERSITY_MATCHING_MODEL = "gpt-5.6-luna";
const REQUIRED_MATCH_COUNT = 5;

/** Strict JSON schema for OpenAI Structured Outputs — avoids malformed LLM JSON (e.g. Arabic text). */
const UNIVERSITY_MATCHING_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "university_matching_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      profileSummary: { type: "string" },
      recommendedStrategy: {
        type: "array",
        items: { type: "string" },
      },
      matches: {
        type: "array",
        minItems: REQUIRED_MATCH_COUNT,
        maxItems: REQUIRED_MATCH_COUNT,
        items: {
          type: "object",
          properties: {
            universityName: { type: "string" },
            programName: { type: "string" },
            city: { type: "string" },
            country: { type: "string" },
            tuitionEstimate: { type: "string" },
            admissionFit: {
              type: "string",
              enum: ["Reach", "Target", "Likely"],
            },
            whyItMatches: {
              type: "array",
              items: { type: "string" },
            },
            considerations: { type: "string" },
            nextSteps: {
              type: "array",
              items: { type: "string" },
            },
            sourceUrl: { type: "string" },
          },
          required: [
            "universityName",
            "programName",
            "city",
            "country",
            "tuitionEstimate",
            "admissionFit",
            "whyItMatches",
            "considerations",
            "nextSteps",
            "sourceUrl",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["profileSummary", "recommendedStrategy", "matches"],
    additionalProperties: false,
  },
};

const MAX_OUTPUT_TOKENS = 16_384;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLocale(value: unknown): "en" | "ar" | undefined {
  if (value === "en" || value === "ar") return value;
  return undefined;
}

function responseLanguageInstructions(locale: "en" | "ar" | undefined): string {
  if (locale === "ar") {
    return `
Language (required):
- The student is using Arabic. Write profileSummary, each recommendedStrategy item, every whyItMatches bullet, considerations, and nextSteps in Modern Standard Arabic.
- Keep universityName, programName, city, country, sourceUrl, and tuitionEstimate in their conventional spelling (Latin script for international university names is fine).
- admissionFit must remain exactly one of these English enum values: "Reach", "Target", or "Likely" (do not translate admissionFit).
`;
  }
  return `
Language:
- Write profileSummary, recommendedStrategy, whyItMatches, considerations, and nextSteps in clear English.
`;
}

function sanitizePayload(body: unknown): StudentMatchingPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  return {
    fullName: String(o.fullName ?? "").trim(),
    schoolName: String(o.schoolName ?? "").trim(),
    schoolCountry: String(o.schoolCountry ?? "").trim(),
    nationality: String(o.nationality ?? "").trim(),
    academicSystem: String(o.academicSystem ?? "").trim(),
    predictedScore: String(o.predictedScore ?? "").trim(),
    testsTaken: asStringArray(o.testsTaken),
    testScoreNotes: String(o.testScoreNotes ?? "").trim(),
    primaryStudyDestination: String(o.primaryStudyDestination ?? "").trim(),
    degreeLevel: String(o.degreeLevel ?? "").trim(),
    intendedMajor: String(o.intendedMajor ?? "").trim(),
    excites: asStringArray(o.excites),
    strongestSubjects: asStringArray(o.strongestSubjects),
    campusEnvironment: String(o.campusEnvironment ?? "").trim(),
    mattersMost: asStringArray(o.mattersMost),
    outsideActivities: asStringArray(o.outsideActivities),
    academicAmbition: String(o.academicAmbition ?? "").trim(),
    goalAfterUniversity: String(o.goalAfterUniversity ?? "").trim(),
    workLocationPreference: String(o.workLocationPreference ?? "").trim(),
    budgetBand: String(o.budgetBand ?? "").trim(),
    extraNotes: String(o.extraNotes ?? "").trim() || undefined,
    locale: parseLocale(o.locale),
  };
}

function validatePayload(p: StudentMatchingPayload): string[] {
  const missing: string[] = [];
  if (!p.fullName) missing.push("fullName");
  if (!p.schoolName) missing.push("schoolName");
  if (!p.schoolCountry) missing.push("schoolCountry");
  if (!p.nationality) missing.push("nationality");
  if (!p.academicSystem) missing.push("academicSystem");
  if (!p.predictedScore) missing.push("predictedScore");
  if (p.testsTaken.length === 0) missing.push("testsTaken");
  if (!p.primaryStudyDestination) missing.push("primaryStudyDestination");
  if (!p.degreeLevel) missing.push("degreeLevel");
  if (!p.intendedMajor) missing.push("intendedMajor");
  if (p.excites.length === 0) missing.push("excites");
  if (p.strongestSubjects.length === 0) missing.push("strongestSubjects");
  if (!p.campusEnvironment) missing.push("campusEnvironment");
  if (p.mattersMost.length === 0 || p.mattersMost.length > 2)
    missing.push("mattersMost");
  if (p.outsideActivities.length === 0) missing.push("outsideActivities");
  if (!p.academicAmbition) missing.push("academicAmbition");
  if (!p.goalAfterUniversity) missing.push("goalAfterUniversity");
  if (!p.workLocationPreference) missing.push("workLocationPreference");
  if (!p.budgetBand) missing.push("budgetBand");
  return missing;
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

function safeJsonParse(text: string): MatchResponse {
  const candidate = extractJsonObject(text);
  return JSON.parse(candidate) as MatchResponse;
}

function parseMatchResponseError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "The AI response could not be parsed. Please try again.";
  }
  return error instanceof Error ? error.message : "Unable to generate matches.";
}

export async function POST(request: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const featureEnabled = await isPlatformFeatureEnabledByKey("ai_university_matching");
  if (!featureEnabled) {
    return NextResponse.json({ error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE }, { status: 403 });
  }

  const limitCheck = await checkStudentAiDailyLimit(auth.studentId, "matching");
  if (!limitCheck.allowed) {
    return NextResponse.json(buildAiDailyLimitExceededPayload(limitCheck), { status: 429 });
  }

  const { studentId } = auth;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to the server environment to enable AI university matching.",
      },
      { status: 500 },
    );
  }

  const model = UNIVERSITY_MATCHING_MODEL;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = sanitizePayload(raw);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const invalid = validatePayload(payload);
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "Missing or invalid fields.", fields: invalid },
      { status: 400 },
    );
  }

  const prompt = `
You are Univeera's university matching advisor — an experienced counselor helping international students build a realistic, personalized shortlist. Use your knowledge and web search (when available) to recommend real universities and programs. Do not rely on any app-owned database; every recommendation must come from your own reasoning and retrieval.

Your goal: give this student exactly ${REQUIRED_MATCH_COUNT} universities they can actually explore next — not a generic popularity list.
${responseLanguageInstructions(payload.locale)}

## Student profile (complete questionnaire)
${JSON.stringify(payload, null, 2)}

## How to choose the ${REQUIRED_MATCH_COUNT} matches (follow in order)

1. **Anchor on destination and degree** — Respect primaryStudyDestination, degreeLevel, and intendedMajor first. Do not recommend universities in countries the student did not choose unless budget or academic fit makes a nearby alternative clearly better (explain in considerations if so).

2. **Weight academics honestly** — Use academicSystem, predictedScore, testsTaken, and testScoreNotes to judge admissionFit:
   - **Likely**: profile clearly meets or exceeds typical published expectations for that program.
   - **Target**: realistic with strong application; some uncertainty.
   - **Reach**: aspirational but still plausible given ambition and scores — not fantasy picks.
   Include at least one Likely, at least one Target, and at least one Reach across the ${REQUIRED_MATCH_COUNT} (adjust if the student's scores are uniformly very high or very limited).

3. **Respect budget and lifestyle** — Filter by budgetBand, campusEnvironment, mattersMost, excites, and outsideActivities. A great academic match that ignores budget or campus preference is a bad match.

4. **Connect to long-term goals** — Tie recommendations to goalAfterUniversity, workLocationPreference, and academicAmbition. Explain how each university supports that path.

5. **Ensure diversity across the shortlist** — The ${REQUIRED_MATCH_COUNT} universities should not be five near-duplicates (same city, same tier, same teaching style). Vary geography within the chosen destination when possible, and mix program angles that still fit the major.

6. **Cite the student's answers** — Every whyItMatches bullet must reference a specific answer from the profile (grades, tests, interests, goals, budget, etc.). Never use vague lines like "this fits your profile" without naming what fits.

7. **Be truthful about gaps** — In considerations, flag what the student must verify: language requirements, portfolio/audition, visa rules, scholarship availability, or score cutoffs. Do not invent exact deadlines or guaranteed funding.

## Output JSON shape
{
  "profileSummary": "2–3 sentences on how this student's academics, goals, and preferences should guide their university search — mention at least 3 distinct profile areas",
  "recommendedStrategy": ["Exactly 3 concise, actionable strategy bullets for their application journey"],
  "matches": [
    {
      "universityName": "Official university name",
      "programName": "Specific program, faculty, or degree title",
      "city": "City",
      "country": "Country",
      "tuitionEstimate": "Annual estimate with currency, or 'Check official page'",
      "admissionFit": "Reach" | "Target" | "Likely",
      "whyItMatches": ["Exactly 4 or 5 concrete bullets tied to this student's answers"],
      "considerations": "One honest risk, tradeoff, or requirement to verify",
      "nextSteps": ["Exactly 2 practical next actions for this university"],
      "sourceUrl": "Official university or program URL"
    }
  ]
}

## Hard rules
- Return exactly ${REQUIRED_MATCH_COUNT} matches — no fewer, no more. Each must be a distinct university (no duplicate universityName).
- whyItMatches: 4–5 strings per match; one sentence each when possible; each bullet must tie to a different aspect of the student's profile where possible.
- Prefer official university or admissions pages for sourceUrl.
- Do not include matchScore, numeric fit scores, rankings, or any other scoring field.
- Do not include markdown, comments, or text outside JSON.
- Escape double quotes inside string values with a backslash.
- Keep responses concise enough to fit structured output limits.
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
        tools: [{ type: "web_search_preview" }],
        max_output_tokens: MAX_OUTPUT_TOKENS,
        text: {
          format: UNIVERSITY_MATCHING_RESPONSE_FORMAT,
        },
      }),
    });

    const result = (await upstream.json()) as unknown;
    if (!upstream.ok) {
      const message =
        typeof result === "object" &&
        result &&
        typeof (result as { error?: { message?: unknown } }).error?.message ===
          "string"
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

    let parsed: MatchResponse & {
      matches?: (UniversityMatch & { matchScore?: unknown })[];
    };
    try {
      parsed = safeJsonParse(outputText) as MatchResponse & {
        matches?: (UniversityMatch & { matchScore?: unknown })[];
      };
    } catch (parseError) {
      return NextResponse.json(
        { error: parseMatchResponseError(parseError) },
        { status: 502 },
      );
    }

    const rawMatches = parsed.matches ?? [];
    if (rawMatches.length !== REQUIRED_MATCH_COUNT) {
      return NextResponse.json(
        {
          error: `The AI must recommend exactly ${REQUIRED_MATCH_COUNT} universities. Please try again.`,
        },
        { status: 502 },
      );
    }

    const universityNames = rawMatches.map((m) =>
      String((m as UniversityMatch).universityName ?? "").trim().toLowerCase(),
    );
    if (new Set(universityNames).size !== REQUIRED_MATCH_COUNT) {
      return NextResponse.json(
        { error: "The AI must recommend distinct universities. Please try again." },
        { status: 502 },
      );
    }

    const matches: MatchResponse = {
      profileSummary: parsed.profileSummary,
      recommendedStrategy: parsed.recommendedStrategy ?? [],
      matches: rawMatches.map((m) => {
        const {
          universityName,
          programName,
          city,
          country,
          tuitionEstimate,
          admissionFit,
          whyItMatches,
          considerations,
          nextSteps,
          sourceUrl,
        } = m as UniversityMatch & { matchScore?: unknown };
        return {
          universityName,
          programName,
          city,
          country,
          tuitionEstimate,
          admissionFit,
          whyItMatches: asStringArray(whyItMatches),
          considerations,
          nextSteps: asStringArray(nextSteps),
          sourceUrl,
        };
      }),
    };
    const usage = extractOpenAiResponseUsage(result);
    const outputsSummary: Json = {
      profileSummary: matches.profileSummary?.slice(0, 4000) ?? "",
      recommendedStrategy: matches.recommendedStrategy ?? [],
      matchCount: matches.matches?.length ?? 0,
      matches: (matches.matches ?? []).map((m) => ({
        universityName: m.universityName,
        programName: m.programName,
        city: m.city,
        country: m.country,
        admissionFit: m.admissionFit,
      })),
    };
    await logStudentAiUsageAndActivity({
      studentId,
      type: "matching",
      model,
      usage,
      inputs: payload as unknown as Json,
      outputs: outputsSummary,
      activityLog: {
        entitiy_type: "ai_university_matching",
        entity_id: studentId,
        action: "ai_university_matching",
        message: `Generated AI university matches (${matches.matches?.length ?? 0} recommendations).`,
      },
    });

    const supabase = await createSupabaseServerClient();
    await recordStudentPlatformCompletionOnce(
      supabase,
      studentId,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_ai_matching,
    ).catch(() => {});

    return NextResponse.json(matches);
  } catch (error) {
    const message = parseMatchResponseError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
