import { Suspense } from "react";

import { InternshipDiscovery } from "./_components/internship-discovery";
import { loadInternshipDiscoveryPageFromSearchParams } from "@/actions/internships";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentInternshipsPage({
  searchParams,
}: PageProps) {
  const pageData =
    await loadInternshipDiscoveryPageFromSearchParams(searchParams);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full px-2 py-12 text-center text-[14px] text-[var(--text-light)]">
          Loading internships…
        </div>
      }
    >
      <InternshipDiscovery pageData={pageData} />
    </Suspense>
  );
}
