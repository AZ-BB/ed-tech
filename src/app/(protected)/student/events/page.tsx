import { Suspense } from "react";

import { loadEventDiscoveryPageFromSearchParams } from "@/actions/events";
import { StudentLoadingCenter } from "../_components/student-spinner";
import { EventDiscovery } from "./_components/event-discovery";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentEventsPage({ searchParams }: PageProps) {
  const pageData = await loadEventDiscoveryPageFromSearchParams(searchParams);

  return (
    <Suspense
      fallback={
        <StudentLoadingCenter
          label="Loading events…"
          className="mx-auto w-full px-2"
        />
      }
    >
      <EventDiscovery pageData={pageData} />
    </Suspense>
  );
}
