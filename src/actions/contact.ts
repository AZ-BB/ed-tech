"use server";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SubmitContactFormResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactForm(
  formData: FormData,
): Promise<SubmitContactFormResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subjectRaw = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || name.length > 120) {
    return { ok: false, error: "Enter your full name (up to 120 characters)." };
  }

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (subjectRaw.length > 200) {
    return { ok: false, error: "Subject must be 200 characters or fewer." };
  }

  if (!message || message.length > 5000) {
    return {
      ok: false,
      error: "Enter a message (up to 5000 characters).",
    };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("contact_submissions").insert({
    name,
    email,
    subject: subjectRaw || null,
    message,
    status: "new",
  });

  if (error) {
    console.error("[submitContactForm]", error);
    return {
      ok: false,
      error: "Could not send your message. Please try again later.",
    };
  }

  return { ok: true };
}
