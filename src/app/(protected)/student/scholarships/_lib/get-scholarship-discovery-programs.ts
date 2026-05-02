import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import { filterScholarships } from "../_components/filter-scholarships";
import type { Scholarship } from "../_components/types";
import { scholarshipMatchesQuery } from "./scholarship-discovery-search";
import { SCHOLARSHIPS_DISCOVERY_SELECT_TRIES } from "./scholarship-discovery-select";
import {
  type ScholarshipDiscoveryRow,
  scholarshipDiscoveryRowToScholarship,
  scholarshipFromPayloadRow,
} from "./scholarship-row-to-scholarship";

export const SCHOLARSHIP_PAGE_SIZE = 6;

export type ScholarshipDiscoveryResolvedQuery = {
  q: string;
  nationality: string;
  destination: string;
  coverage: string;
  page: number;
  detail: string | null;
};

function pick(
  sp: Record<string, string | string[] | undefined>,
  key: string,
  fallback: string,
): string {
  const v = sp[key];
  const s = Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  return typeof s === "string" ? s : fallback;
}

/** Treat missing / blank / "any" as no filter (so empty query string shows full catalog). */
function pickFilterAny(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): "any" | string {
  const raw = pick(sp, key, "").trim();
  if (!raw || raw.toLowerCase() === "any") return "any";
  return raw;
}

function parsePage(sp: Record<string, string | string[] | undefined>): number {
  const fromPage = Number.parseInt(pick(sp, "page", ""), 10);
  if (Number.isFinite(fromPage) && fromPage >= 1) return fromPage;
  const legacyGov = Number.parseInt(pick(sp, "govPage", ""), 10);
  if (Number.isFinite(legacyGov) && legacyGov >= 1) return legacyGov;
  const legacyIntl = Number.parseInt(pick(sp, "intlPage", ""), 10);
  if (Number.isFinite(legacyIntl) && legacyIntl >= 1) return legacyIntl;
  return 1;
}

export function parseScholarshipDiscoverySearchParams(
  sp: Record<string, string | string[] | undefined>,
): ScholarshipDiscoveryResolvedQuery {
  const page = Math.max(1, parsePage(sp));
  const detailRaw = pick(sp, "detail", "").trim();

  const natRaw = pickFilterAny(sp, "nat");
  const nationality = natRaw === "any" ? "any" : natRaw.toLowerCase();

  const destRaw = pickFilterAny(sp, "dest");
  const destination = destRaw === "any" ? "any" : destRaw;

  const covRaw = pickFilterAny(sp, "cov");
  const coverage = covRaw === "any" ? "any" : covRaw.toLowerCase();

  return {
    q: pick(sp, "q", "").trim(),
    nationality,
    destination,
    coverage,
    page,
    detail: detailRaw.length ? detailRaw : null,
  };
}

/** Prefer `discovery_payload`; otherwise map from core columns only. */
function mapDiscoveryRow(row: ScholarshipDiscoveryRow): Scholarship | null {
  if (row.discovery_payload && typeof row.discovery_payload === "object") {
    return scholarshipFromPayloadRow({
      id: row.id,
      discovery_slug: row.discovery_slug,
      discovery_payload: row.discovery_payload as Record<string, unknown>,
    });
  }
  if (row.name?.trim()) {
    return scholarshipDiscoveryRowToScholarship(row);
  }
  return null;
}

async function fetchScholarshipsMapped(): Promise<Scholarship[]> {
  const supabase = await createSupabaseServerClient();

  for (const selectList of SCHOLARSHIPS_DISCOVERY_SELECT_TRIES) {
    const res = await supabase
      .from("scholarships")
      .select(selectList)
      .order("name", { ascending: true });

    if (!res.error) {
      const rows = (res.data ?? []) as unknown as ScholarshipDiscoveryRow[];
      const out: Scholarship[] = [];
      for (const row of rows) {
        const s = mapDiscoveryRow(row);
        if (s) out.push(s);
      }
      return out;
    }

    console.warn(
      "[fetchScholarshipsMapped] select failed, trying narrower column set:",
      res.error.message,
    );
  }

  console.error("[fetchScholarshipsMapped] all select variants failed");
  return [];
}

export type ScholarshipDiscoveryPageData = {
  scholarships: Scholarship[];
  totalMatching: number;
  totalCatalog: number;
  page: number;
  totalPages: number;
  pageSize: number;
  filters: { q: string; nat: string; dest: string; cov: string };
  detailId: string | null;
  detailScholarship: Scholarship | null;
};

export async function getScholarshipDiscoveryPageData(
  query: ScholarshipDiscoveryResolvedQuery,
): Promise<ScholarshipDiscoveryPageData> {
  const all = await fetchScholarshipsMapped();
  const totalCatalog = all.length;

  if (totalCatalog === 0) {
    return {
      scholarships: [],
      totalMatching: 0,
      totalCatalog: 0,
      page: 1,
      totalPages: 1,
      pageSize: SCHOLARSHIP_PAGE_SIZE,
      filters: {
        q: query.q,
        nat: query.nationality,
        dest: query.destination,
        cov: query.coverage,
      },
      detailId: query.detail,
      detailScholarship: null,
    };
  }

  const searched = query.q.trim()
    ? all.filter((s) => scholarshipMatchesQuery(s, query.q))
    : all;
  const filtered = filterScholarships(
    searched,
    query.nationality,
    query.destination,
    query.coverage,
  );

  const totalMatching = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalMatching / SCHOLARSHIP_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);

  const scholarships = filtered.slice(
    (page - 1) * SCHOLARSHIP_PAGE_SIZE,
    page * SCHOLARSHIP_PAGE_SIZE,
  );

  const detailScholarship = query.detail
    ? (filtered.find((s) => s.id === query.detail) ?? null)
    : null;

  return {
    scholarships,
    totalMatching,
    totalCatalog,
    page,
    totalPages,
    pageSize: SCHOLARSHIP_PAGE_SIZE,
    filters: {
      q: query.q,
      nat: query.nationality,
      dest: query.destination,
      cov: query.coverage,
    },
    detailId: query.detail,
    detailScholarship,
  };
}
