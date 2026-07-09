import { Suspense } from "react";

import { loadProgramExplorerPageFromSearchParams } from "@/actions/programs-discovery";
import { ProgramsExplorer } from "./_components/programs-explorer";
import { ProgramsPageLoadingFallback } from "./_components/programs-loading-fallback";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentProgramsPage({ searchParams }: PageProps) {
  const pageData = await loadProgramExplorerPageFromSearchParams(searchParams);

  return (
    <Suspense fallback={<ProgramsPageLoadingFallback />}>
      <ProgramsExplorer pageData={pageData} />
    </Suspense>
  );
}
