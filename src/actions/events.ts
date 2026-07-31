"use server";

import { getEventDiscoveryPageData } from "@/app/(protected)/student/events/_lib/get-event-discovery-page";
import { parseEventDiscoverySearchParams } from "@/app/(protected)/student/events/_lib/parse-event-discovery-search-params";

export async function loadEventDiscoveryPage(
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  return getEventDiscoveryPageData(
    parseEventDiscoverySearchParams(rawSearchParams),
  );
}

export async function loadEventDiscoveryPageFromSearchParams(
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | undefined,
) {
  const raw = searchParams ? await searchParams : {};
  return loadEventDiscoveryPage(raw);
}
