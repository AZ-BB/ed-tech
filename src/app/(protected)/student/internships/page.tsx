import { Suspense } from "react";

import { StudentLoadingCenter } from "../_components/student-spinner";
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
        <StudentLoadingCenter
          label="Loading internships…"
          className="mx-auto w-full px-2"
        />
      }
    >
      <InternshipDiscovery pageData={pageData} />
    </Suspense>
  );
}
