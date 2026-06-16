import {
  DEFAULT_APPLICATION_CHECKLIST_SLOTS,
} from "@/lib/application-checklist-defaults";
import type { Database } from "@/database.types";
import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationChecklistDocRow =
  Database["public"]["Tables"]["application_checklist_documents"]["Row"];

async function appendRowIfInsertConflict(
  client: DbClient,
  applicationId: number,
  slotKey: string,
  rows: ApplicationChecklistDocRow[],
  ins: ApplicationChecklistDocRow[] | null | undefined,
  insErr: { code?: string; message?: string } | null,
  logLabel: string,
): Promise<ApplicationChecklistDocRow[]> {
  if (!insErr && ins?.[0]) {
    return [...rows, ins[0]];
  }
  if (insErr?.code === "23505") {
    const { data: fetched, error: fetchErr } = await client
      .from("application_checklist_documents")
      .select("*")
      .eq("application_id", applicationId)
      .eq("slot_key", slotKey)
      .maybeSingle();
    if (fetchErr) {
      console.error(`[ensureApplicationChecklistDocuments] ${logLabel} refetch`, fetchErr);
      return rows;
    }
    if (fetched && !rows.some((r) => r.slot_key === slotKey)) {
      return [...rows, fetched as ApplicationChecklistDocRow];
    }
    return rows;
  }
  if (insErr) {
    console.error(`[ensureApplicationChecklistDocuments] ${logLabel}`, insErr);
  }
  return rows;
}

export async function ensureApplicationChecklistDocuments(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationChecklistDocRow[]> {
  const { data: existing, error: selErr } = await client
    .from("application_checklist_documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (selErr) {
    console.error("[ensureApplicationChecklistDocuments]", selErr);
    return [];
  }

  let rows = (existing ?? []) as ApplicationChecklistDocRow[];
  const existingKeys = new Set(rows.map((r) => r.slot_key));

  for (const slot of DEFAULT_APPLICATION_CHECKLIST_SLOTS) {
    if (existingKeys.has(slot.slot_key)) continue;

    const { data: ins, error: insErr } = await client
      .from("application_checklist_documents")
      .insert({
        application_id: applicationId,
        slot_key: slot.slot_key,
        display_name: slot.display_name,
        status: "not_requested",
        sort_order: slot.sort_order,
      })
      .select("*");

    rows = await appendRowIfInsertConflict(
      client,
      applicationId,
      slot.slot_key,
      rows,
      ins ?? undefined,
      insErr,
      `default slot ${slot.slot_key}`,
    );
    existingKeys.add(slot.slot_key);
  }

  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

export async function fetchApplicationChecklistDocuments(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationChecklistDocRow[]> {
  const rows = await ensureApplicationChecklistDocuments(client, applicationId);
  return rows;
}
