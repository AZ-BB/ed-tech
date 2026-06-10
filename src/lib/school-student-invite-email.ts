import "server-only";

import { isResendConfigured } from "@/lib/resend/config";
import { buildSignupPageUrl } from "@/lib/resend/site-url";
import { sendStudentSchoolInviteEmail } from "@/lib/resend/student-school-invite-email";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type SchoolStudentInviteInviter =
  | { kind: "platform" }
  | { kind: "school_admin"; userId: string };

function resolveStudentFirstName(
  studentEmail: string,
  explicit?: string | null,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;

  const local = studentEmail.split("@")[0]?.trim() ?? "";
  const segment = local.split(/[._+-]/)[0]?.trim() ?? "";
  if (!segment) return "there";

  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

async function rollbackSchoolStudentInvite(
  supabase: SupabaseSecretClient,
  schoolStudentId: string,
) {
  const { error } = await supabase
    .from("school_students")
    .delete()
    .eq("id", schoolStudentId);

  if (error) {
    console.error("[school-student-invite-email] rollback delete", error);
  }
}

export async function sendInviteEmailAfterSchoolStudentCreated(opts: {
  supabase: SupabaseSecretClient;
  schoolId: string;
  schoolStudentId: string;
  studentEmail: string;
  inviter: SchoolStudentInviteInviter;
  schoolCode?: string;
  schoolName?: string | null;
  studentFirstName?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  if (!isResendConfigured()) {
    await rollbackSchoolStudentInvite(opts.supabase, opts.schoolStudentId);
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  let schoolCode = opts.schoolCode?.trim();
  let schoolName = opts.schoolName?.trim() ?? "";

  if (!schoolCode || !schoolName) {
    const { data: school, error: schoolError } = await opts.supabase
      .from("schools")
      .select("code, name")
      .eq("id", opts.schoolId)
      .maybeSingle();

    if (schoolError || !school?.code?.trim()) {
      await rollbackSchoolStudentInvite(opts.supabase, opts.schoolStudentId);
      return { error: "Could not load the school access code for the invitation email." };
    }

    schoolCode = school.code.trim();
    if (!schoolName) {
      schoolName = school.name?.trim() ?? "";
    }
  }

  if (!schoolName) {
    schoolName = "Your school";
  }

  const signupUrl = await buildSignupPageUrl();
  const studentFirstName = resolveStudentFirstName(
    opts.studentEmail,
    opts.studentFirstName,
  );

  const result = await sendStudentSchoolInviteEmail({
    to: opts.studentEmail,
    studentFirstName,
    schoolName,
    schoolCode,
    signupUrl,
  });

  if ("error" in result) {
    await rollbackSchoolStudentInvite(opts.supabase, opts.schoolStudentId);
    return {
      error: result.error || "Invitation email could not be sent.",
    };
  }

  return { ok: true };
}
