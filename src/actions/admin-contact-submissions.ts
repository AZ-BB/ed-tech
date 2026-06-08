"use server";

import type { Database } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ContactSubmissionStatus =
  Database["public"]["Enums"]["contact_submission_status"];

type AdminContactSubmissionActionResult =
  | { ok: true }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_VALUES = new Set<ContactSubmissionStatus>([
  "new",
  "read",
  "archived",
]);

function revalidateContactSubmissionsPath() {
  revalidatePath("/admin/contact-us");
}

async function assertAdminAccess(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-contact-submissions] admin lookup", adminError);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false,
      error: "You do not have permission to manage contact submissions.",
    };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  return { ok: true };
}

function parseSubmissionId(raw: string): string | null {
  const value = raw.trim();
  if (!UUID_RE.test(value)) return null;
  return value;
}

export async function updateContactSubmissionStatus(
  id: string,
  status: ContactSubmissionStatus,
): Promise<AdminContactSubmissionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const submissionId = parseSubmissionId(id);
  if (!submissionId) {
    return { ok: false, error: "Invalid submission." };
  }

  if (!STATUS_VALUES.has(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("contact_submissions")
    .update({ status })
    .eq("id", submissionId);

  if (error) {
    console.error("[updateContactSubmissionStatus]", error);
    return { ok: false, error: "Could not update submission status." };
  }

  revalidateContactSubmissionsPath();
  return { ok: true };
}

export async function deleteContactSubmission(
  id: string,
): Promise<AdminContactSubmissionActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const submissionId = parseSubmissionId(id);
  if (!submissionId) {
    return { ok: false, error: "Invalid submission." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("contact_submissions")
    .delete()
    .eq("id", submissionId);

  if (error) {
    console.error("[deleteContactSubmission]", error);
    return { ok: false, error: "Could not delete submission." };
  }

  revalidateContactSubmissionsPath();
  return { ok: true };
}
