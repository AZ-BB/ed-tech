import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminApplicationAdminOption = {
  id: string;
  label: string;
};

export const ADMIN_APPLICATIONS_ADMIN_PREFIX = "admin:" as const;

type FetchAdminApplicationAdminOptionsParams = {
  /** Keep the current assignment visible in the assign modal when marked inactive. */
  includeAdminId?: string | null;
  includeAdminIds?: string[];
};

function formatAdminLabel(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email.trim() || "Admin";
}

export async function fetchAdminApplicationAdminOptions(
  params?: FetchAdminApplicationAdminOptionsParams,
): Promise<AdminApplicationAdminOption[]> {
  const supabase = await createSupabaseSecretClient();
  const includeAdminId = params?.includeAdminId?.trim() ?? "";
  const includeAdminIds = [
    ...new Set(
      [
        includeAdminId,
        ...(params?.includeAdminIds ?? []).map((id) => id.trim()).filter(Boolean),
      ].filter(Boolean),
    ),
  ];

  let query = supabase
    .from("admins")
    .select("id, first_name, last_name, email")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (includeAdminIds.length > 0) {
    const activeClause = "is_active.eq.true";
    const includeClause = includeAdminIds.map((id) => `id.eq.${id}`).join(",");
    query = query.or(`${activeClause},${includeClause}`);
  } else {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminApplicationAdminOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: formatAdminLabel(
      row.first_name?.trim() ?? "",
      row.last_name?.trim() ?? "",
      row.email?.trim() ?? "",
    ),
  }));
}

export function adminAssigneeOptionValue(
  kind: "admin" | "advisor",
  id: string,
): string {
  return `${kind}:${id}`;
}

export function parseAdminAssigneeOptionValue(
  raw: string,
): { kind: "admin" | "advisor"; id: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "unassigned") return null;

  const match = /^(admin|advisor):([0-9a-f-]{36})$/i.exec(trimmed);
  if (!match) return null;

  return {
    kind: match[1] as "admin" | "advisor",
    id: match[2],
  };
}
