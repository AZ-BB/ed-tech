import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import type { Scholarship } from "../_components/types";
import {
  SCHOLARSHIPS_DISCOVERY_ROW_SELECT,
  SCHOLARSHIPS_DISCOVERY_SELECT_TRIES,
} from "./scholarship-discovery-select";
import {
  type ScholarshipDiscoveryRow,
  discoveryUiIdFromScholarshipRow,
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

type RpcDiscoveryPage = {
  total: number;
  catalog_total: number;
  rows: Record<string, unknown>[];
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

function parseRpcPayload(raw: unknown): RpcDiscoveryPage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const total = Number(o.total ?? 0);
  const catalog_total = Number(o.catalog_total ?? 0);
  const rows = o.rows;
  if (!Array.isArray(rows)) return null;
  return { total, catalog_total, rows };
}

async function fetchDiscoveryPageRpc(
  query: ScholarshipDiscoveryResolvedQuery,
  page: number,
): Promise<RpcDiscoveryPage | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_scholarships_discovery_page", {
    p_q: query.q,
    p_nat: query.nationality,
    p_dest: query.destination,
    p_cov: query.coverage,
    p_limit: SCHOLARSHIP_PAGE_SIZE,
    p_offset: (Math.max(1, page) - 1) * SCHOLARSHIP_PAGE_SIZE,
  });
  if (error) {
    console.error("[fetchDiscoveryPageRpc]", error.message);
    return null;
  }
  return parseRpcPayload(data);
}

async function fetchScholarshipByDetailId(
  detailId: string,
): Promise<Scholarship | null> {
  const supabase = await createSupabaseServerClient();

  for (const selectList of SCHOLARSHIPS_DISCOVERY_SELECT_TRIES) {
    const bySlug = await supabase
      .from("scholarships")
      .select(selectList)
      .eq("discovery_slug", detailId)
      .maybeSingle();
    if (bySlug.error?.message?.toLowerCase().includes("column")) continue;
    if (bySlug.data) {
      return mapDiscoveryRow(bySlug.data as unknown as ScholarshipDiscoveryRow);
    }

    const byPayloadId = await supabase
      .from("scholarships")
      .select(selectList)
      .filter("discovery_payload->>id", "eq", detailId)
      .maybeSingle();
    if (byPayloadId.error?.message?.toLowerCase().includes("column")) continue;
    if (byPayloadId.data) {
      return mapDiscoveryRow(byPayloadId.data as unknown as ScholarshipDiscoveryRow);
    }

    break;
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(detailId)) {
    for (const selectList of SCHOLARSHIPS_DISCOVERY_SELECT_TRIES) {
      const { data, error } = await supabase
        .from("scholarships")
        .select(selectList)
        .eq("id", detailId)
        .maybeSingle();
      if (error?.message?.toLowerCase().includes("column")) continue;
      if (data) return mapDiscoveryRow(data as unknown as ScholarshipDiscoveryRow);
      break;
    }
  }

  return null;
}

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function fetchScholarshipActivityDiscoveryKeys(
  supabase: SupabaseServer,
  studentId: string,
  activityType: "save" | "shortlist",
): Promise<string[]> {
  const { data, error } = await supabase
    .from("student_activities")
    .select(
      "scholarships ( id, discovery_slug, discovery_payload )",
    )
    .eq("student_id", studentId)
    .eq("entity_type", "scholarship")
    .eq("type", activityType);

  if (error || !data?.length) return [];

  const keys = new Set<string>();
  for (const row of data) {
    const raw = row as {
      scholarships: unknown;
    };
    const sch = raw.scholarships;
    if (!sch) continue;
    const rowSch = Array.isArray(sch) ? sch[0] : sch;
    if (
      !rowSch ||
      typeof rowSch !== "object" ||
      !("id" in rowSch) ||
      typeof (rowSch as { id: unknown }).id !== "string"
    ) {
      continue;
    }
    const typed = rowSch as {
      id: string;
      discovery_slug: string | null;
      discovery_payload?: unknown;
    };
    keys.add(discoveryUiIdFromScholarshipRow(typed));
  }
  return [...keys];
}

async function loadScholarshipActivityIds(): Promise<{
  savedDiscoveryIds: string[];
  shortlistedDiscoveryIds: string[];
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { savedDiscoveryIds: [], shortlistedDiscoveryIds: [] };
  }
  const [savedDiscoveryIds, shortlistedDiscoveryIds] = await Promise.all([
    fetchScholarshipActivityDiscoveryKeys(supabase, user.id, "save"),
    fetchScholarshipActivityDiscoveryKeys(supabase, user.id, "shortlist"),
  ]);
  return { savedDiscoveryIds, shortlistedDiscoveryIds };
}

/** Resolves `scholarships.id` (UUID) from a discovery UI id (slug, payload id, or row UUID). */
export async function resolveScholarshipUuidForDiscoveryId(
  discoveryId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(discoveryId)) {
    const { data, error } = await supabase
      .from("scholarships")
      .select("id")
      .eq("id", discoveryId)
      .maybeSingle();
    if (!error && data?.id) return data.id;
  }
  const { data: bySlug } = await supabase
    .from("scholarships")
    .select("id")
    .eq("discovery_slug", discoveryId)
    .maybeSingle();
  if (bySlug?.id) return bySlug.id;
  const { data: byPayload } = await supabase
    .from("scholarships")
    .select("id")
    .filter("discovery_payload->>id", "eq", discoveryId)
    .maybeSingle();
  return byPayload?.id ?? null;
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
  savedDiscoveryIds: string[];
  shortlistedDiscoveryIds: string[];
};

export async function getScholarshipDiscoveryPageData(
  query: ScholarshipDiscoveryResolvedQuery,
): Promise<ScholarshipDiscoveryPageData> {
  const filters = {
    q: query.q,
    nat: query.nationality,
    dest: query.destination,
    cov: query.coverage,
  };

  const activityIds = await loadScholarshipActivityIds();

  let page = Math.max(1, query.page);
  let rpc = await fetchDiscoveryPageRpc(query, page);

  if (!rpc) {
    return {
      scholarships: [],
      totalMatching: 0,
      totalCatalog: 0,
      page: 1,
      totalPages: 1,
      pageSize: SCHOLARSHIP_PAGE_SIZE,
      filters,
      detailId: query.detail,
      detailScholarship: null,
      ...activityIds,
    };
  }

  const totalCatalog = rpc.catalog_total;

  if (totalCatalog === 0) {
    return {
      scholarships: [],
      totalMatching: 0,
      totalCatalog: 0,
      page: 1,
      totalPages: 1,
      pageSize: SCHOLARSHIP_PAGE_SIZE,
      filters,
      detailId: query.detail,
      detailScholarship: query.detail
        ? await fetchScholarshipByDetailId(query.detail)
        : null,
      ...activityIds,
    };
  }

  let totalMatching = rpc.total;
  let totalPages = Math.max(1, Math.ceil(totalMatching / SCHOLARSHIP_PAGE_SIZE));
  if (page > totalPages && totalMatching > 0) {
    page = totalPages;
    rpc = await fetchDiscoveryPageRpc(query, page);
    if (!rpc) {
      return {
        scholarships: [],
        totalMatching: 0,
        totalCatalog,
        page: 1,
        totalPages: 1,
        pageSize: SCHOLARSHIP_PAGE_SIZE,
        filters,
        detailId: query.detail,
        detailScholarship: null,
        ...activityIds,
      };
    }
    totalMatching = rpc.total;
    totalPages = Math.max(1, Math.ceil(totalMatching / SCHOLARSHIP_PAGE_SIZE));
  }

  const scholarships: Scholarship[] = [];
  for (const row of rpc.rows) {
    const s = mapDiscoveryRow(row as unknown as ScholarshipDiscoveryRow);
    if (s) scholarships.push(s);
  }

  let detailScholarship: Scholarship | null = null;
  if (query.detail) {
    detailScholarship =
      scholarships.find((s) => s.id === query.detail) ??
      (await fetchScholarshipByDetailId(query.detail));
  }

  return {
    scholarships,
    totalMatching,
    totalCatalog,
    page,
    totalPages,
    pageSize: SCHOLARSHIP_PAGE_SIZE,
    filters,
    detailId: query.detail,
    detailScholarship,
    ...activityIds,
  };
}
