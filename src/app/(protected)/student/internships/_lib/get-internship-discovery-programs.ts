import "server-only";

import { createSupabaseServerClient } from "@/utils/supabase-server";

import type { Internship, InternshipSection } from "../_components/types";
import {
  internshipRowToInternship,
  type InternshipDiscoveryRow,
} from "./internship-row-to-internship";
import {
  parseInternshipDiscoverySearchParams,
  type InternshipDiscoveryResolvedQuery,
  type InternshipLocFilter,
  type InternshipPayFilter,
} from "./parse-internship-discovery-search-params";

export {
  parseInternshipDiscoverySearchParams,
  type InternshipDiscoveryResolvedQuery,
  type InternshipLocFilter,
  type InternshipPayFilter,
};

export const INTERNSHIP_SECTION_ORDER: InternshipSection[] = [
  "live",
  "global",
  "competition",
  "find",
];

/** Cards per page across the full filtered catalog (single pagination). */
export const INTERNSHIP_PAGE_SIZE = 12;

export type InternshipDiscoverySectionSlice = {
  section: InternshipSection;
  internships: Internship[];
};

export type InternshipDiscoveryPageData = {
  sections: InternshipDiscoverySectionSlice[];
  /** Matching rows after loc/pay/favourites filters. */
  total: number;
  /** Matching rows after loc/pay only (before favourites). Used for empty-catalog vs no-results. */
  catalogTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: {
    loc: InternshipLocFilter;
    pay: InternshipPayFilter;
    favouritesOnly: boolean;
  };
  detailId: string | null;
  detailInternship: Internship | null;
  savedDiscoveryIds: string[];
};

type RpcDiscoveryPayload = {
  total: number;
  rows: Record<string, unknown>[];
};

function parseRpcPayload(raw: unknown): RpcDiscoveryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const total = Number(o.total ?? 0);
  const rows = o.rows;
  if (!Array.isArray(rows)) return null;
  return { total, rows: rows as Record<string, unknown>[] };
}

function mapRow(raw: Record<string, unknown>): Internship | null {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  if (!id && !slug) return null;
  return internshipRowToInternship(raw as unknown as InternshipDiscoveryRow);
}

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function fetchSavedInternshipSlugs(
  supabase: SupabaseServer,
  studentId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("student_activities")
    .select("internships ( slug )")
    .eq("student_id", studentId)
    .eq("entity_type", "internship")
    .eq("type", "save");

  if (error || !data?.length) return [];

  const keys = new Set<string>();
  for (const row of data) {
    const raw = row as { internships: unknown };
    const joined = raw.internships;
    const item = Array.isArray(joined) ? joined[0] : joined;
    if (
      item &&
      typeof item === "object" &&
      "slug" in item &&
      typeof (item as { slug: unknown }).slug === "string"
    ) {
      const slug = (item as { slug: string }).slug.trim();
      if (slug) keys.add(slug);
    }
  }
  return [...keys];
}

async function loadSavedDiscoveryIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];
  return fetchSavedInternshipSlugs(supabase, user.id);
}

async function fetchInternshipByDetailId(
  detailId: string,
): Promise<Internship | null> {
  const supabase = await createSupabaseServerClient();
  const bySlug = await supabase
    .from("internships")
    .select("*")
    .eq("slug", detailId)
    .eq("is_active", true)
    .maybeSingle();
  if (bySlug.data) {
    return internshipRowToInternship(
      bySlug.data as unknown as InternshipDiscoveryRow,
    );
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(detailId)) return null;

  const byId = await supabase
    .from("internships")
    .select("*")
    .eq("id", detailId)
    .eq("is_active", true)
    .maybeSingle();
  if (byId.data) {
    return internshipRowToInternship(
      byId.data as unknown as InternshipDiscoveryRow,
    );
  }
  return null;
}

function groupBySection(
  internships: Internship[],
): InternshipDiscoverySectionSlice[] {
  const buckets = new Map<InternshipSection, Internship[]>();
  for (const section of INTERNSHIP_SECTION_ORDER) {
    buckets.set(section, []);
  }
  for (const item of internships) {
    const list = buckets.get(item.section);
    if (list) list.push(item);
    else {
      buckets.set(item.section, [item]);
    }
  }
  return INTERNSHIP_SECTION_ORDER.map((section) => ({
    section,
    internships: buckets.get(section) ?? [],
  })).filter((s) => s.internships.length > 0);
}

/** Loc/pay query params for RPC (`p_loc`, `p_pay`). */
function rpcLoc(loc: InternshipLocFilter): string {
  if (loc === "any") return "any";
  if (loc === "MENA") return "MENA";
  if (loc === "Remote") return "Remote";
  return loc;
}

export async function getInternshipDiscoveryPageData(
  query: InternshipDiscoveryResolvedQuery,
): Promise<InternshipDiscoveryPageData> {
  const filters = {
    loc: query.loc,
    pay: query.pay,
    favouritesOnly: query.favouritesOnly,
  };
  const supabase = await createSupabaseServerClient();

  const [rpcRes, savedDiscoveryIds] = await Promise.all([
    supabase.rpc("rpc_internships_discovery", {
      p_loc: rpcLoc(query.loc),
      p_pay: query.pay,
    }),
    loadSavedDiscoveryIds(),
  ]);

  if (rpcRes.error) {
    console.error("[getInternshipDiscoveryPageData]", rpcRes.error.message);
  }

  const parsed = parseRpcPayload(rpcRes.data);
  let internships: Internship[] = [];
  if (parsed) {
    for (const row of parsed.rows) {
      const mapped = mapRow(row);
      if (mapped) internships.push(mapped);
    }
  }

  const catalogTotal = internships.length;

  if (query.favouritesOnly) {
    const saved = new Set(savedDiscoveryIds);
    internships = internships.filter(
      (i) => saved.has(i.slug) || saved.has(i.id),
    );
  }

  const total = internships.length;
  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / INTERNSHIP_PAGE_SIZE));
  const page =
    total === 0 ? 1 : Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * INTERNSHIP_PAGE_SIZE;
  const pageSlice = internships.slice(start, start + INTERNSHIP_PAGE_SIZE);

  const detailInternship = query.detail
    ? (internships.find(
        (i) => i.slug === query.detail || i.id === query.detail,
      ) ?? (await fetchInternshipByDetailId(query.detail)))
    : null;

  return {
    sections: groupBySection(pageSlice),
    total,
    catalogTotal,
    page,
    pageSize: INTERNSHIP_PAGE_SIZE,
    totalPages,
    filters,
    detailId: query.detail,
    detailInternship,
    savedDiscoveryIds,
  };
}
