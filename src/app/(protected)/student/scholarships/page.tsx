import { Suspense } from "react";

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
        <div className="mx-auto w-full px-2 py-12 text-center text-[14px] text-[var(--text-light)]">
          Loading scholarships…
        </div>
      }
    >
      <ScholarshipDiscovery pageData={pageData} />
    </Suspense>
  );
}
