"use server";

import type { Database } from "@/database.types";
import { ADMIN_NEWS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type NewsTag = Database["public"]["Enums"]["news_tag"];

type AdminNewsActionResult = { ok: true } | { ok: false; error: string };

export type CreateAdminNewsItemResult =
  | { ok: true; newsItemId: number }
  | { ok: false; error: string };

import { NEWS_TAG_VALUES } from "@/app/(protected)/admin/content/_data/admin-news-data";

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
    console.error("[admin-news] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage news.",
    };
  }

  return { ok: true as const };
}

function parseNewsItemId(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNewsTag(raw: FormDataEntryValue | null): NewsTag | null {
  const value = String(raw ?? "").trim();
  if (!NEWS_TAG_VALUES.has(value)) return null;
  return value as NewsTag;
}

function revalidateNewsPaths() {
  revalidatePath(ADMIN_NEWS_HOME);
  revalidatePath("/student");
}

export async function createAdminNewsItem(
  formData: FormData,
): Promise<CreateAdminNewsItemResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const tag = parseNewsTag(formData.get("tag"));
  const text = String(formData.get("text") ?? "").trim();

  if (!tag) {
    return { ok: false, error: "Select a valid tag." };
  }

  if (!text) {
    return { ok: false, error: "Headline is required." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("news_items")
    .insert({
      tag,
      text,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminNewsItem]", error);
    return { ok: false, error: "Could not create news item." };
  }

  revalidateNewsPaths();
  return { ok: true, newsItemId: data.id };
}

export async function updateAdminNewsItem(
  formData: FormData,
): Promise<AdminNewsActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parseNewsItemId(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid news item." };
  }

  const tag = parseNewsTag(formData.get("tag"));
  const text = String(formData.get("text") ?? "").trim();

  if (!tag) {
    return { ok: false, error: "Select a valid tag." };
  }

  if (!text) {
    return { ok: false, error: "Headline is required." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("news_items")
    .update({
      tag,
      text,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminNewsItem]", error);
    return { ok: false, error: "Could not update news item." };
  }

  revalidateNewsPaths();
  return { ok: true };
}

export async function deleteAdminNewsItem(
  newsItemId: number,
): Promise<AdminNewsActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(newsItemId) || newsItemId <= 0) {
    return { ok: false, error: "Invalid news item." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("news_items").delete().eq("id", newsItemId);

  if (error) {
    console.error("[deleteAdminNewsItem]", error);
    return { ok: false, error: "Could not delete news item." };
  }

  revalidateNewsPaths();
  return { ok: true };
}
