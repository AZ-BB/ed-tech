import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { AiUniversityMatching } from "./_components/ai-university-matching";

export const dynamic = "force-dynamic";

export default async function StudentAiMatchingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordStudentPlatformCompletionOnce(
      supabase,
      user.id,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_ai_matching,
    );
  }
  return <AiUniversityMatching />;
}
