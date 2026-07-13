import { NextResponse } from "next/server";
import {
  loadDiscoveryConfig,
} from "@/lib/discovery/discovery-repository";
import { getStudentDiscoveryModules } from "@/lib/discovery/discovery-student-modules";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const service = await createSupabaseSecretClient();
    const [config, attempts] = await Promise.all([
      loadDiscoveryConfig(service),
      service
        .from("student_discovery_attempts")
        .select("module_id, completed_at")
        .eq("student_id", auth.studentId),
    ]);

    if (attempts.error) throw attempts.error;

    const completedSet = new Set((attempts.data ?? []).map((a) => a.module_id));

    const modules = getStudentDiscoveryModules(config).map((module) => ({
      id: module.moduleId,
      title: module.title,
      number: module.number,
      subtitle: module.subtitle,
      description: module.description,
      answerFormat: module.answerFormat,
      numItems: module.questions.length,
      sortOrder: module.sortOrder,
      categories: module.categories,
      questions: module.questions,
      profiles: module.profiles,
      completed: completedSet.has(module.moduleId),
    }));

    return NextResponse.json({
      scales: config.scales,
      modules,
      version: config.version,
    });
  } catch (error) {
    console.error("[discovery/modules] GET", error);
    return NextResponse.json({ error: "Failed to load discovery modules." }, { status: 500 });
  }
}
