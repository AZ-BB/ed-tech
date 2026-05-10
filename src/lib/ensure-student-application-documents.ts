import {
  DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const DEFAULT_SLOT_COUNT = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.length;

function slotOrderIndex(slotKey: string): number {
  const i = DEFAULT_MY_APPLICATION_DOCUMENT_SLOTS.findIndex(
    (s) => s.slot_key === slotKey,
  );
  return i === -1 ? DEFAULT_SLOT_COUNT : i;
}

export function sortApplicationDocumentsBySlotOrder(rows: DocRow[]): DocRow[] {
  return [...rows].sort((a, b) => {
    const ia = slotOrderIndex(a.slot_key);
    const ib = slotOrderIndex(b.slot_key);
    if (ia !== ib) return ia - ib;
    return a.display_name.localeCompare(b.display_name);
  });
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
        if (insErr) {
          console.error(
            "[ensureStudentApplicationDocuments] predicted slot backfill",
            insErr,
          );
        } else if (ins?.[0]) {
          rows = [...rows, ins[0] as DocRow];
        }
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
