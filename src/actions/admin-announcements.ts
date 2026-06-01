"use server";

import {
  ADMIN_ANNOUNCEMENTS_HOME,
} from "@/app/(protected)/admin/content/_data/content-tabs-data";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminAnnouncementActionResult = { ok: true } | { ok: false; error: string };

export type CreateAdminAnnouncementResult =
  | { ok: true; announcementId: number }
  | { ok: false; error: string };

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-announcements] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage announcements.",
    };
  }

  return { ok: true as const };
}

function parseAnnouncementId(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function revalidateAnnouncementPaths() {
  revalidatePath(ADMIN_ANNOUNCEMENTS_HOME);
  revalidatePath("/student");
}

export async function createAdminAnnouncement(
  formData: FormData,
): Promise<CreateAdminAnnouncementResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (!content) {
    return { ok: false, error: "Content is required." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("announcements")
    .insert({
      title,
      content,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminAnnouncement]", error);
    return { ok: false, error: "Could not create announcement." };
  }

  revalidateAnnouncementPaths();
  return { ok: true, announcementId: data.id };
}

export async function updateAdminAnnouncement(
  formData: FormData,
): Promise<AdminAnnouncementActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parseAnnouncementId(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid announcement." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (!content) {
    return { ok: false, error: "Content is required." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("announcements")
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminAnnouncement]", error);
    return { ok: false, error: "Could not update announcement." };
  }

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function deleteAdminAnnouncement(
  announcementId: number,
): Promise<AdminAnnouncementActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(announcementId) || announcementId <= 0) {
    return { ok: false, error: "Invalid announcement." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("announcements").delete().eq("id", announcementId);

  if (error) {
    console.error("[deleteAdminAnnouncement]", error);
    return { ok: false, error: "Could not delete announcement." };
  }

  revalidateAnnouncementPaths();
  return { ok: true };
}
