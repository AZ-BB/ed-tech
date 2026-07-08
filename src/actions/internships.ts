"use server";

import {
  getInternshipDiscoveryPageData,
  parseInternshipDiscoverySearchParams,
  type InternshipDiscoveryPageData,
} from "@/app/(protected)/student/internships/_lib/get-internship-discovery-programs";

export type {
  InternshipDiscoveryPageData,
  InternshipDiscoveryResolvedQuery,
  InternshipLocFilter,
  InternshipPayFilter,
} from "@/app/(protected)/student/internships/_lib/get-internship-discovery-programs";

/** Loads internship discovery (filters + detail) from the database. */
export async function loadInternshipDiscoveryPage(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<InternshipDiscoveryPageData> {
  return getInternshipDiscoveryPageData(
    parseInternshipDiscoverySearchParams(rawSearchParams),
  );
}

/** Convenience for RSC `searchParams` promises. */
export async function loadInternshipDiscoveryPageFromSearchParams(
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | undefined,
): Promise<InternshipDiscoveryPageData> {
  const raw = searchParams ? await searchParams : {};
  return loadInternshipDiscoveryPage(raw);
}
