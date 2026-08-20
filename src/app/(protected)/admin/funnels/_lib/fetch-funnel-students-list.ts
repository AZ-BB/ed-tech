import { format } from "date-fns";

import {
  CUSTOM_WITH_FORM_SIGNUP_SOURCE,
  MILAD_SIGNUP_SOURCE,
  type FunnelSignupSource,
} from "@/lib/funnel-stats";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminFunnelKey = "milad" | "custom-with-form";

export type AdminFunnelStudentRow = {
  id: string;
  name: string;
  email: string;
  grade: string;
  signedUpAt: string;
  href: string;
};

export type AdminFunnelStudentsListResult = {
  rows: AdminFunnelStudentRow[];
  totalRows: number;
};

const FUNNEL_SOURCE_BY_KEY: Record<AdminFunnelKey, FunnelSignupSource> = {
  milad: MILAD_SIGNUP_SOURCE,
  "custom-with-form": CUSTOM_WITH_FORM_SIGNUP_SOURCE,
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const name = [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
  return name || "—";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function getFunnelSignupSource(funnelKey: AdminFunnelKey): FunnelSignupSource {
  return FUNNEL_SOURCE_BY_KEY[funnelKey];
}

export async function fetchFunnelStudentsList(
  funnelKey: AdminFunnelKey,
  page: number,
  limit: number,
): Promise<AdminFunnelStudentsListResult> {
  const supabase = await createSupabaseSecretClient();
  const source = getFunnelSignupSource(funnelKey);
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await supabase
    .from("student_profiles")
    .select("id, first_name, last_name, email, grade, created_at", { count: "exact" })
    .eq("student_type", "custom")
    .filter("meta_data->>source", "eq", source)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchFunnelStudentsList]", funnelKey, error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminFunnelStudentRow[] = (data ?? []).map((row) => ({
    id: row.id,
    name: personName(row.first_name, row.last_name),
    email: row.email?.trim() || "—",
    grade: row.grade?.trim() || "—",
    signedUpAt: formatWhen(row.created_at),
    href: `/admin/users/students/${row.id}`,
  }));

  return { rows, totalRows: count ?? 0 };
}
