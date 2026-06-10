import "server-only";

import { isResendConfigured } from "@/lib/resend/config";
import { sendPasswordResetEmail } from "@/lib/resend/password-reset-email";
import {
  buildPasswordResetVerifyUrl,
  buildResetPasswordPageUrl,
} from "@/lib/resend/site-url";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function firstNameFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const firstName = (metadata as { firstName?: unknown }).firstName;
  if (typeof firstName !== "string") return null;
  const trimmed = firstName.trim();
  return trimmed || null;
}

async function resolveFirstNameForEmail(
  supabase: SupabaseSecretClient,
  email: string,
  authMetadata?: unknown,
): Promise<string> {
  const fromAuth = firstNameFromMetadata(authMetadata);
  if (fromAuth) return fromAuth;

  const [student, admin, teacher] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("first_name")
      .eq("email", email)
      .maybeSingle(),
    supabase.from("admins").select("first_name").eq("email", email).maybeSingle(),
    supabase
      .from("school_admin_profiles")
      .select("first_name")
      .eq("email", email)
      .maybeSingle(),
  ]);

  const fromProfile =
    student.data?.first_name?.trim() ||
    admin.data?.first_name?.trim() ||
    teacher.data?.first_name?.trim();

  if (fromProfile) return fromProfile;

  const local = email.split("@")[0]?.trim() ?? "";
  const segment = local.split(/[._+-]/)[0]?.trim() ?? "";
  if (!segment) return "there";

  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

export type SendPasswordResetLinkOptions = {
  /** When true, returns success even if the account does not exist. */
  silentIfMissing?: boolean;
  firstName?: string | null;
};

export async function sendPasswordResetLinkViaResend(
  emailRaw: string,
  options?: SendPasswordResetLinkOptions,
): Promise<{ ok: true } | { error: string }> {
  const email = normalizeEmail(emailRaw);

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!isResendConfigured()) {
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const supabase = await createSupabaseSecretClient();
  const resetPageUrl = await buildResetPasswordPageUrl();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: resetPageUrl },
  });

  const hashedToken = data?.properties?.hashed_token?.trim();
  const actionLink = data?.properties?.action_link?.trim();

  if (error || (!hashedToken && !actionLink)) {
    if (options?.silentIfMissing) {
      return { ok: true };
    }

    console.error("[password-reset-email] generateLink", error);
    return {
      error: error?.message || "Could not generate password reset link.",
    };
  }

  const resetUrl = hashedToken
    ? buildPasswordResetVerifyUrl(resetPageUrl, hashedToken)
    : actionLink!;
  const explicitFirstName = options?.firstName?.trim();
  const firstName =
    explicitFirstName ||
    (await resolveFirstNameForEmail(
      supabase,
      email,
      data.user?.user_metadata,
    ));

  const emailResult = await sendPasswordResetEmail({
    to: email,
    firstName,
    resetUrl,
  });

  if ("error" in emailResult) {
    return {
      error: emailResult.error || "Password reset email could not be sent.",
    };
  }

  return { ok: true };
}
