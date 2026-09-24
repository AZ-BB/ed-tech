"use server";

import {
  isValidCalendlySchedulingUrl,
  isValidInfluencerSlug,
  normalizeInfluencerSlug,
} from "@/lib/influencer-funnel-slugs";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

const ADMIN_FUNNELS_PATH = "/admin/funnels";

async function assertAdminAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
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
    console.error("[admin-influencer-funnels] admin lookup", adminError);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission to manage funnels." };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  return { ok: true };
}

function parseDisplayName(formData: FormData): string {
  return String(formData.get("displayName") ?? "").trim();
}

function parseSlug(formData: FormData): string {
  const raw = String(formData.get("slug") ?? "").trim();
  return normalizeInfluencerSlug(raw);
}

function parseCalendlyUrl(formData: FormData): string {
  return String(formData.get("calendlySchedulingUrl") ?? "").trim();
}

function parseIsActive(formData: FormData): boolean {
  return String(formData.get("isActive") ?? "") === "on";
}

export async function createAdminInfluencerFunnel(formData: FormData): Promise<ActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const displayName = parseDisplayName(formData);
  const slug = parseSlug(formData);
  const calendlySchedulingUrl = parseCalendlyUrl(formData);

  if (!displayName) {
    return { ok: false, error: "Display name is required." };
  }

  if (!isValidInfluencerSlug(slug)) {
    return {
      ok: false,
      error: "URL slug must be 2–64 characters, lowercase letters, numbers, and hyphens only, and not reserved.",
    };
  }

  if (!isValidCalendlySchedulingUrl(calendlySchedulingUrl)) {
    return { ok: false, error: "Enter a valid https://calendly.com/ scheduling link." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service.from("influencer_funnels").insert({
    slug,
    display_name: displayName,
    calendly_scheduling_url: calendlySchedulingUrl,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That URL slug is already in use." };
    }
    console.error("[createAdminInfluencerFunnel]", error);
    return { ok: false, error: "Could not create funnel." };
  }

  revalidatePath(ADMIN_FUNNELS_PATH);
  return { ok: true };
}

export async function updateAdminInfluencerFunnel(formData: FormData): Promise<ActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing funnel id." };
  }

  const displayName = parseDisplayName(formData);
  const slug = parseSlug(formData);
  const calendlySchedulingUrl = parseCalendlyUrl(formData);
  const isActive = parseIsActive(formData);

  if (!displayName) {
    return { ok: false, error: "Display name is required." };
  }

  if (!isValidInfluencerSlug(slug)) {
    return {
      ok: false,
      error: "URL slug must be 2–64 characters, lowercase letters, numbers, and hyphens only, and not reserved.",
    };
  }

  if (!isValidCalendlySchedulingUrl(calendlySchedulingUrl)) {
    return { ok: false, error: "Enter a valid https://calendly.com/ scheduling link." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("influencer_funnels")
    .update({
      slug,
      display_name: displayName,
      calendly_scheduling_url: calendlySchedulingUrl,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That URL slug is already in use." };
    }
    console.error("[updateAdminInfluencerFunnel]", error);
    return { ok: false, error: "Could not update funnel." };
  }

  revalidatePath(ADMIN_FUNNELS_PATH);
  return { ok: true };
}
