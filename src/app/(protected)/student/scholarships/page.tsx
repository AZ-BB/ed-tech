import { Suspense } from "react";

import { StudentLoadingCenter } from "../_components/student-spinner";
import { ScholarshipDiscovery } from "./_components/scholarship-discovery";
import { loadScholarshipDiscoveryPageFromSearchParams } from "@/actions/Scholarships";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentScholarshipsPage({ searchParams }: PageProps) {
  const pageData = await loadScholarshipDiscoveryPageFromSearchParams(searchParams);

  return (
    <Suspense
      fallback={
        <StudentLoadingCenter
          label="Loading scholarships…"
          className="mx-auto w-full px-2"
        />
      }
    >
      <ScholarshipDiscovery pageData={pageData} />
    </Suspense>
  );
}
