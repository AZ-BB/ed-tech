import { NextResponse } from "next/server";
import {
  fetchDiscoveryModuleContentArMap,
  fetchDiscoverySettings,
  loadDiscoveryConfig,
} from "@/lib/discovery/discovery-repository";
import { getStudentDiscoveryModules } from "@/lib/discovery/discovery-student-modules";
import {
  applyDiscoveryModuleLocalization,
  applyDiscoveryScalesLocalization,
} from "@/lib/content-localization";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const locale = await getServerLocale();
    const service = await createSupabaseSecretClient();
    const [config, attempts, contentArMap, settings] = await Promise.all([
      loadDiscoveryConfig(service),
      service
        .from("student_discovery_attempts")
        .select("module_id, completed_at")
        .eq("student_id", auth.studentId),
      fetchDiscoveryModuleContentArMap(service),
      fetchDiscoverySettings(service),
    ]);

    if (attempts.error) throw attempts.error;

    const completedSet = new Set((attempts.data ?? []).map((a) => a.module_id));

    const modules = getStudentDiscoveryModules(config).map((module) => {
      const localized = applyDiscoveryModuleLocalization(
        locale,
        module,
        (contentArMap[module.moduleId] ?? null) as never,
      );
      return {
        id: module.moduleId,
        title: localized.title,
        number: module.number,
        subtitle: localized.subtitle,
        description: localized.description,
        answerFormat: module.answerFormat,
        numItems: module.questions.length,
        sortOrder: module.sortOrder,
        categories: localized.categories,
        questions: localized.questions,
        profiles: localized.profiles,
        completed: completedSet.has(module.moduleId),
        useRtlContent: localized.useRtlContent,
      };
    });

    const scales = applyDiscoveryScalesLocalization(
      locale,
      config.scales,
      settings.content_ar ?? null,
    );

    return NextResponse.json({
      scales,
      modules,
      version: config.version,
    });
  } catch (error) {
    console.error("[discovery/modules] GET", error);
    return NextResponse.json({ error: "Failed to load discovery modules." }, { status: 500 });
  }
}
