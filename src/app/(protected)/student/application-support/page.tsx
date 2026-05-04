import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

import { ApplicationSupportClient } from "./_components/application-support-client";

export const dynamic = "force-dynamic";

export default async function StudentApplicationSupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordStudentPlatformCompletionOnce(
      supabase,
      user.id,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_application_support,
    );
  }

  const secret = await createSupabaseSecretClient();
  const { data: plans } = await secret
    .from("applications_plans")
    .select("*")
    .eq("is_active", true)
    .order("universities_count", { ascending: true });

  return <ApplicationSupportClient plans={plans ?? []} />;
}
