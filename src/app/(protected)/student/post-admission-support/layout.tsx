import { fetchPostAdmissionReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { PostAdmissionBookingProvider } from "./_components/post-admission-booking-provider";

import "./post-admission-support.css";

export const dynamic = "force-dynamic";

export default async function PostAdmissionSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const auth = await requireStudentSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [postAdmissionReceivingAdvisor, profileDefaults] = await Promise.all([
    fetchPostAdmissionReceivingAdvisor(),
    auth.ok ? loadStudentFormDefaults(auth.studentId, user?.email) : Promise.resolve(null),
  ]);

  return (
    <PostAdmissionBookingProvider
      postAdmissionReceivingAdvisor={postAdmissionReceivingAdvisor}
      profileDefaults={profileDefaults}
    >
      {children}
    </PostAdmissionBookingProvider>
  );
}
