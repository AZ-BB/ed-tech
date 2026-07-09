"use server";

import { getProgramExplorerPage } from "@/app/(protected)/student/programs/_lib/get-program-explorer-page";

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function loadProgramExplorerPageFromSearchParams(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const sp = (await searchParams) ?? {};
  return getProgramExplorerPage({
    q: readParam(sp.q),
    interest: readParam(sp.interest),
  });
}

// Kept for any legacy callers; routes now use the explorer loader.
export { loadProgramExplorerPageFromSearchParams as loadProgramDiscoveryPageFromSearchParams };
