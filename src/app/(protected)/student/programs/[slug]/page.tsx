import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProgramDetailView } from "../_components/program-detail-view";
import { getProgramUniversityOfferings } from "../_lib/get-program-university-offerings";
import {
  getProgramDetailBySlug,
  getRelatedPrograms,
} from "../_lib/get-program-explorer-page";
import { getProgramSavedState } from "../_lib/get-program-saved-state";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StudentProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const program = await getProgramDetailBySlug(slug);

  if (!program) {
    notFound();
  }

  const [universityOfferings, relatedPrograms, initialSaved] = await Promise.all([
    getProgramUniversityOfferings(slug),
    getRelatedPrograms(program),
    getProgramSavedState(program.id),
  ]);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full px-4 py-12 text-center text-[14px] text-[var(--text-light)]">
          Loading program…
        </div>
      }
    >
      <ProgramDetailView
        program={program}
        universityOfferings={universityOfferings}
        relatedPrograms={relatedPrograms}
        initialSaved={initialSaved}
      />
    </Suspense>
  );
}
