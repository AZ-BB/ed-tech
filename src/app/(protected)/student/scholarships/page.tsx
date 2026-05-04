import { Suspense } from "react";

import { ScholarshipDiscovery } from "./_components/scholarship-discovery";
import { loadScholarshipDiscoveryPageFromSearchParams } from "@/actions/Scholarships";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentScholarshipsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordStudentPlatformCompletionOnce(
      supabase,
      user.id,
      STUDENT_PLATFORM_COMPLETION_FLAGS.viewed_scholarships,
    );
  }

  const pageData = await loadScholarshipDiscoveryPageFromSearchParams(searchParams);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full px-2 py-12 text-center text-[14px] text-[var(--text-light)]">
          Loading scholarships…
        </div>
      }
    >
      <ScholarshipDiscovery pageData={pageData} />
    </Suspense>
  );
}
