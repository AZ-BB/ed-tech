import type { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ApplicationPlanSnapshot = {
  name: string;
  description: string | null;
  price: number;
  universities_count: number;
};

export type ApplicationPlanCatalogRow = ApplicationPlanSnapshot & {
  id: number;
};

type PlanEmbed =
  | Partial<ApplicationPlanSnapshot>
  | Partial<ApplicationPlanSnapshot>[]
  | null
  | undefined;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

export async function fetchApplicationsPlansByIds(
  client: DbClient,
  planIds: number[],
): Promise<Map<number, ApplicationPlanSnapshot>> {
  const uniquePlanIds = [...new Set(planIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniquePlanIds.length === 0) return new Map();

  const { data, error } = await client
    .from("applications_plans")
    .select("id, name, description, price, universities_count")
    .in("id", uniquePlanIds);

  if (error) {
    console.error("[fetchApplicationsPlansByIds]", error);
    return new Map();
  }

  const plans = new Map<number, ApplicationPlanSnapshot>();
  for (const plan of data ?? []) {
    plans.set(plan.id, {
      name: plan.name?.trim() || "Application package",
      description: plan.description?.trim() || null,
      price: plan.price,
      universities_count: plan.universities_count,
    });
  }

  return plans;
}

export async function fetchActiveApplicationPlans(
  client: DbClient,
): Promise<ApplicationPlanCatalogRow[]> {
  const { data, error } = await client
    .from("applications_plans")
    .select("id, name, description, price, universities_count")
    .eq("is_active", true)
    .order("universities_count", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error("[fetchActiveApplicationPlans]", error);
    return [];
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name?.trim() || "Application package",
    description: plan.description?.trim() || null,
    price: plan.price,
    universities_count: plan.universities_count,
  }));
}

export function resolveApplicationsPlanEmbed(
  planId: number,
  embed: PlanEmbed,
  planById: Map<number, ApplicationPlanSnapshot>,
): ApplicationPlanSnapshot | null {
  const fromTable = planById.get(planId);
  if (fromTable) return fromTable;

  const fromEmbed = firstEmbed(embed);
  if (!fromEmbed) return null;

  if (
    typeof fromEmbed.price !== "number" ||
    !Number.isFinite(fromEmbed.price) ||
    typeof fromEmbed.universities_count !== "number" ||
    !Number.isFinite(fromEmbed.universities_count) ||
    !fromEmbed.name
  ) {
    return null;
  }

  return {
    name: fromEmbed.name.trim() || "Application package",
    description: fromEmbed.description?.trim() ?? null,
    price: fromEmbed.price,
    universities_count: fromEmbed.universities_count,
  };
}

export async function hydrateApplicationsPlansEmbeds<T extends { plan_id: number }>(
  client: DbClient,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const planById = await fetchApplicationsPlansByIds(
    client,
    rows.map((row) => row.plan_id),
  );

  return rows.map((row) => ({
    ...row,
    applications_plans: resolveApplicationsPlanEmbed(
      row.plan_id,
      "applications_plans" in row
        ? (row as { applications_plans?: PlanEmbed }).applications_plans
        : undefined,
      planById,
    ),
  }));
}
