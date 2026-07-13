import { NextResponse } from "next/server";
import {
  fetchStudentAttempt,
} from "@/lib/discovery/discovery-repository";
import {
  recordDiscoveryJourneyCompletionIfDone,
  submitDiscoveryModule,
} from "@/lib/discovery/submit-discovery-module";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import type { ModuleAnswer } from "@/types/discovery";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ moduleId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { moduleId } = await context.params;

  let body: { answers?: ModuleAnswer[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) {
    return NextResponse.json({ error: "answers array is required." }, { status: 400 });
  }

  try {
    const service = await createSupabaseSecretClient();
    const result = await submitDiscoveryModule(service, auth.studentId, moduleId, answers);

    const supabase = await createSupabaseServerClient();
    await recordDiscoveryJourneyCompletionIfDone(supabase, auth.studentId, service);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    const status = message.includes(":") || message.includes("required") ? 400 : 500;
    if (status === 500) console.error("[discovery/submit] POST", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { moduleId } = await context.params;

  try {
    const service = await createSupabaseSecretClient();
    const attempt = await fetchStudentAttempt(service, auth.studentId, moduleId);
    if (!attempt) {
      return NextResponse.json({ error: "No result found for this module." }, { status: 404 });
    }

    return NextResponse.json({
      moduleId,
      answers: attempt.answers_json,
      result: attempt.result_json,
    });
  } catch (error) {
    console.error("[discovery/module] GET", error);
    return NextResponse.json({ error: "Failed to load module result." }, { status: 500 });
  }
}
