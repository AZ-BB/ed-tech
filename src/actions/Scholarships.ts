"use server";

import {
  getScholarshipDiscoveryPageData,
  parseScholarshipDiscoverySearchParams,
  type ScholarshipDiscoveryPageData,
} from "@/app/(protected)/student/scholarships/_lib/get-scholarship-discovery-programs";

/** Loads one discovery page (filters, search, pagination) from the database. */
export async function loadScholarshipDiscoveryPage(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<ScholarshipDiscoveryPageData> {
  return getScholarshipDiscoveryPageData(
    parseScholarshipDiscoverySearchParams(rawSearchParams),
  );
}

/** Convenience for RSC `searchParams` promises. */
export async function loadScholarshipDiscoveryPageFromSearchParams(
  searchParams: Promise<Record<string, string | string[] | undefined>> | undefined,
): Promise<ScholarshipDiscoveryPageData> {
  const raw = searchParams ? await searchParams : {};
  return loadScholarshipDiscoveryPage(raw);
}
