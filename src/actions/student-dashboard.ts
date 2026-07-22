"use server";

import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  QUICK_ACTIONS_TOUR_FLAG,
  recordStudentPlatformCompletionOnce,
} from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function dismissQuickActionsTour(): Promise<{ ok: boolean }> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { ok: false };
  }

  const supabase = await createSupabaseServerClient();
  await recordStudentPlatformCompletionOnce(
    supabase,
    auth.studentId,
    QUICK_ACTIONS_TOUR_FLAG,
  );

  return { ok: true };
}
