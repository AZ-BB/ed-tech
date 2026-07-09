import { Suspense } from "react";

import { loadProgramExplorerPageFromSearchParams } from "@/actions/programs-discovery";
import { ProgramsExplorer } from "./_components/programs-explorer";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentProgramsPage({ searchParams }: PageProps) {
  const pageData = await loadProgramExplorerPageFromSearchParams(searchParams);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full px-4 py-12 text-center text-[14px] text-[var(--text-light)]">
          Loading programs…
        </div>
      }
    >
      <ProgramsExplorer pageData={pageData} />
    </Suspense>
  );
}
