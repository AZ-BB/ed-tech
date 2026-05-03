import { NextResponse } from "next/server";
import type { Json } from "@/database.types";
import {
  extractOpenAiResponseUsage,
  logStudentAiUsageAndActivity,
  requireStudentSession,
} from "@/lib/student-ai-usage-log";

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
};

type UniversityMatch = {
  universityName: string;
  programName: string;
  city: string;
  country: string;
  matchScore: number;
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

const fallbackModel = "gpt-4.1-mini";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
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

function safeJsonParse(text: string): MatchResponse {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as MatchResponse;
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
          "OPENAI_API_KEY is not configured. Add it to the server environment to enable AI university matching.",
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
You are Univeera's university matching advisor. Recommend universities using reasoning and retrieval over your knowledge (web search when available). Do not call external databases owned by this app — your recommendations come entirely from the model.

Student profile (complete questionnaire):
${JSON.stringify(payload, null, 2)}

Return exactly valid JSON with this shape:
{
  "profileSummary": "2 sentence summary of how this student's profile should guide university choice",
  "recommendedStrategy": ["3 concise strategy bullets for applications"],
  "matches": [
    {
      "universityName": "Official university name",
      "programName": "Relevant program or faculty",
      "city": "City",
      "country": "Country",
      "matchScore": 0-100,
      "tuitionEstimate": "Annual estimate with currency, or 'Check official page'",
      "admissionFit": "Reach" | "Target" | "Likely",
      "whyItMatches": ["3 concrete reasons tied to this student's answers"],
      "considerations": "One honest risk, tradeoff, or requirement to verify",
      "nextSteps": ["2 practical next actions"],
      "sourceUrl": "Official university or program URL"
    }
  ]
}

Rules:
- Recommend 5 to 7 universities aligned with destination preferences, budget band, academics, lifestyle, and goals.
- Prefer official university or admissions pages for sourceUrl.
- Do not include markdown, comments, or text outside JSON.
- Do not invent exact deadlines or scholarship guarantees; say what must be verified on official sites.
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

    const matches = safeJsonParse(outputText) as MatchResponse;
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
        matchScore: m.matchScore,
        admissionFit: m.admissionFit,
      })),
    };
    void logStudentAiUsageAndActivity({
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

    return NextResponse.json(matches);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate matches.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
