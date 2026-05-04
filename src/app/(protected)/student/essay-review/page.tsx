import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { EssayReviewClient } from "./_components/essay-review-client";

export const dynamic = "force-dynamic";

export default async function StudentEssayReviewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordStudentPlatformCompletionOnce(
      supabase,
      user.id,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_essay_review,
    );
  }
  return <EssayReviewClient />;
}
