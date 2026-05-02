import { Suspense } from "react";

import { ScholarshipDiscovery } from "./_components/scholarship-discovery";
import {
  getScholarshipDiscoveryPageData,
  parseScholarshipDiscoverySearchParams,
} from "./_lib/get-scholarship-discovery-programs";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentScholarshipsPage({ searchParams }: PageProps) {
  const raw = searchParams ? await searchParams : {};
  const pageData = await getScholarshipDiscoveryPageData(
    parseScholarshipDiscoverySearchParams(raw),
  );

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
