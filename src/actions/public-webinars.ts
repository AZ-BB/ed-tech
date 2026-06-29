"use server";

import { revalidatePath } from "next/cache";
import { sendWebinarRegistrationConfirmationForNewGuestRegistration } from "@/lib/send-webinar-emails";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type RegisterWebinarGuestResult = { ok: true } | { ok: false; error: string };

export type RegisterWebinarGuestInput = {
  name: string;
  email: string;
  phone?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerForWebinarAsGuest(
  webinarId: number,
  input: RegisterWebinarGuestInput,
): Promise<RegisterWebinarGuestResult> {
  const guestName = input.name.trim();
  const guestEmail = normalizeEmail(input.email);
  const guestPhone = input.phone?.trim() || null;

  if (!guestName || guestName.length < 2) {
    return { ok: false, error: "Please enter your full name." };
  }

  if (!guestEmail || !EMAIL_RE.test(guestEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: webinar, error: webinarErr } = await secret
    .from("webinars")
    .select("id, status, max_students, scheduled_at, meeting_link")
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    return { ok: false, error: "Webinar not found." };
  }

  if (webinar.status !== "upcoming") {
    return { ok: false, error: "This webinar is not open for registration." };
  }

  if (new Date(webinar.scheduled_at).getTime() <= Date.now()) {
    return { ok: false, error: "This webinar has already started." };
  }

  const { count, error: countErr } = await secret
    .from("webinar_registrations")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId);

  if (countErr) {
    console.error("[registerForWebinarAsGuest] count", countErr);
    return { ok: false, error: "Could not verify capacity." };
  }

  if ((count ?? 0) >= webinar.max_students) {
    return { ok: false, error: "This webinar is full." };
  }

  const { data: existingGuest, error: existingGuestErr } = await secret
    .from("webinar_registrations")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("registration_type", "non_platform")
    .ilike("guest_email", guestEmail)
    .maybeSingle();

  if (existingGuestErr) {
    console.error("[registerForWebinarAsGuest] existingGuest", existingGuestErr);
    return { ok: false, error: "Could not verify registration." };
  }

  if (existingGuest) {
    return { ok: false, error: "This email is already registered for this webinar." };
  }

  const { data: platformRegs, error: platformRegsErr } = await secret
    .from("webinar_registrations")
    .select(
      `
      id,
      student_profiles ( email )
    `,
    )
    .eq("webinar_id", webinarId)
    .eq("registration_type", "platform");

  if (platformRegsErr) {
    console.error("[registerForWebinarAsGuest] platformRegs", platformRegsErr);
    return { ok: false, error: "Could not verify registration." };
  }

  const emailAlreadyOnPlatform = (platformRegs ?? []).some((row) => {
    const profile = Array.isArray(row.student_profiles)
      ? row.student_profiles[0]
      : row.student_profiles;
    return normalizeEmail(profile?.email ?? "") === guestEmail;
  });

  if (emailAlreadyOnPlatform) {
    return { ok: false, error: "This email is already registered for this webinar." };
  }

  const { data: inserted, error: insertErr } = await secret
    .from("webinar_registrations")
    .insert({
      webinar_id: webinarId,
      registration_type: "non_platform",
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      student_id: null,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[registerForWebinarAsGuest] insert", insertErr);
    return { ok: false, error: "Could not complete registration." };
  }

  const emailResult = await sendWebinarRegistrationConfirmationForNewGuestRegistration(
    webinarId,
    inserted.id,
  );
  if (!emailResult.ok) {
    console.error("[registerForWebinarAsGuest] registration confirmation email", emailResult.error);
  }

  revalidatePath("/webinars");
  return { ok: true };
}
