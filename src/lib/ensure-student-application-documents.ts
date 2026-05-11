import {
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  OTHER_DOCUMENT_EXTRA_KEY_PREFIX,
  OTHER_DOCUMENT_SLOT_KEY,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  isOtherDocumentSlot,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const DEFAULT_SLOT_COUNT = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.length;

function slotOrderIndex(slotKey: string): number {
  const normalized = isOtherDocumentSlot(slotKey)
    ? OTHER_DOCUMENT_SLOT_KEY
    : slotKey;
  const i = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.findIndex(
    (s) => s.slot_key === normalized,
  );
  return i === -1 ? DEFAULT_SLOT_COUNT : i;
}

function otherSlotTieBreak(slotKey: string): number {
  if (slotKey === OTHER_DOCUMENT_SLOT_KEY) return 0;
  if (slotKey.startsWith(OTHER_DOCUMENT_EXTRA_KEY_PREFIX)) return 1;
  return 2;
}

export function sortApplicationDocumentsBySlotOrder(rows: DocRow[]): DocRow[] {
  return [...rows].sort((a, b) => {
    const ia = slotOrderIndex(a.slot_key);
    const ib = slotOrderIndex(b.slot_key);
    if (ia !== ib) return ia - ib;
    if (isOtherDocumentSlot(a.slot_key) && isOtherDocumentSlot(b.slot_key)) {
      const ta = otherSlotTieBreak(a.slot_key);
      const tb = otherSlotTieBreak(b.slot_key);
      if (ta !== tb) return ta - tb;
      const ca = a.created_at ?? "";
      const cb = b.created_at ?? "";
      if (ca !== cb) return ca.localeCompare(cb);
    }
    return a.display_name.localeCompare(b.display_name);
  });
}

async function appendRowIfInsertConflict(
  supabase: SecretClient,
  studentId: string,
  slotKey: string,
  rows: DocRow[],
  ins: DocRow[] | null | undefined,
  insErr: { code?: string; message?: string } | null,
  logLabel: string,
): Promise<DocRow[]> {
  if (!insErr && ins?.[0]) {
    return [...rows, ins[0] as DocRow];
  }
  if (insErr?.code === "23505") {
    const { data: fetched, error: fetchErr } = await supabase
      .from("student_my_application_documents")
      .select("*")
      .eq("student_id", studentId)
      .eq("slot_key", slotKey)
      .maybeSingle();
    if (fetchErr) {
      console.error(`[ensureStudentApplicationDocuments] ${logLabel} refetch`, fetchErr);
      return rows;
    }
    if (fetched && !rows.some((r) => r.slot_key === slotKey)) {
      return [...rows, fetched as DocRow];
    }
    return rows;
  }
  if (insErr) {
    console.error(`[ensureStudentApplicationDocuments] ${logLabel}`, insErr);
  }
  return rows;
}

/**
 * Ensures default checklist rows exist (same as student My Applications first load).
 * Use service-role / secret client only on the server.
 */
export async function ensureStudentApplicationDocuments(
  supabase: SecretClient,
  studentId: string,
): Promise<DocRow[]> {
  const { data: existing, error: selErr } = await supabase
    .from("student_my_application_documents")
    .select("*")
    .eq("student_id", studentId);
  if (selErr) {
    console.error("[ensureStudentApplicationDocuments]", selErr);
    return [];
  }
  if (existing && existing.length > 0) {
    let rows = existing as DocRow[];
    const hasPredicted = rows.some(
      (r) => r.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
    );
    if (!hasPredicted) {
      const predDef = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.find(
        (s) => s.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
      );
      if (predDef) {
        const { data: ins, error: insErr } = await supabase
          .from("student_my_application_documents")
          .insert({
            student_id: studentId,
            slot_key: predDef.slot_key,
            display_name: predDef.display_name,
            description: predDef.description,
            status: "missing",
          })
          .select("*");
        rows = await appendRowIfInsertConflict(
          supabase,
          studentId,
          predDef.slot_key,
          rows,
          ins ?? undefined,
          insErr,
          "predicted slot backfill",
        );
      }
    }
    const hasOther = rows.some((r) => r.slot_key === OTHER_DOCUMENT_SLOT_KEY);
    if (!hasOther) {
      const otherDef = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.find(
        (s) => s.slot_key === OTHER_DOCUMENT_SLOT_KEY,
      );
      if (otherDef) {
        const { data: ins, error: insErr } = await supabase
          .from("student_my_application_documents")
          .insert({
            student_id: studentId,
            slot_key: otherDef.slot_key,
            display_name: otherDef.display_name,
            description: otherDef.description,
            status: "missing",
          })
          .select("*");
        rows = await appendRowIfInsertConflict(
          supabase,
          studentId,
          otherDef.slot_key,
          rows,
          ins ?? undefined,
          insErr,
          "other slot backfill",
        );
      }
    }
    return sortApplicationDocumentsBySlotOrder(rows);
  }
  const rows = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.map((s) => ({
    student_id: studentId,
    slot_key: s.slot_key,
    display_name: s.display_name,
    description: s.description,
    status: "missing" as const,
  }));
  const { data: inserted, error: insErr } = await supabase
    .from("student_my_application_documents")
    .insert(rows)
    .select("*");
  if (insErr) {
    console.error("[ensureStudentApplicationDocuments] insert", insErr);
    return [];
  }
  return sortApplicationDocumentsBySlotOrder((inserted ?? []) as DocRow[]);
}
