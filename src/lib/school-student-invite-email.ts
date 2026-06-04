import "server-only";

import { formatSchoolTeacherLabel } from "@/lib/student-teacher-assignment";
import { isResendConfigured } from "@/lib/resend/config";
import { buildSignupPageUrl } from "@/lib/resend/site-url";
import { sendStudentSchoolInviteEmail } from "@/lib/resend/student-school-invite-email";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type SchoolStudentInviteInviter =
  | { kind: "platform" }
  | { kind: "school_admin"; userId: string };

const PLATFORM_INVITER_NAME = "Univeera";

async function resolveInvitedByName(
  supabase: SupabaseSecretClient,
  inviter: SchoolStudentInviteInviter,
): Promise<string> {
  if (inviter.kind === "platform") {
    return PLATFORM_INVITER_NAME;
  }

  const { data: profile, error } = await supabase
    .from("school_admin_profiles")
    .select("first_name, last_name, email")
    .eq("id", inviter.userId)
    .maybeSingle();

  if (error) {
    console.error("[school-student-invite-email] school_admin_profiles", error);
    return "Your school counselor";
  }

  if (!profile) {
    return "Your school counselor";
  }

  return formatSchoolTeacherLabel(
    profile.first_name?.trim() ?? "",
    profile.last_name?.trim() ?? "",
    profile.email?.trim() ?? "",
  );
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
}): Promise<{ ok: true } | { error: string }> {
  if (!isResendConfigured()) {
    await rollbackSchoolStudentInvite(opts.supabase, opts.schoolStudentId);
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  let schoolCode = opts.schoolCode?.trim();
  let schoolName = opts.schoolName ?? null;

  if (!schoolCode) {
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
    schoolName = school.name?.trim() ?? null;
  }

  const invitedByName = await resolveInvitedByName(opts.supabase, opts.inviter);
  const signupUrl = await buildSignupPageUrl();

  const result = await sendStudentSchoolInviteEmail({
    to: opts.studentEmail,
    studentEmail: opts.studentEmail,
    schoolCode,
    invitedByName,
    signupUrl,
    schoolName,
  });

  if ("error" in result) {
    await rollbackSchoolStudentInvite(opts.supabase, opts.schoolStudentId);
    return {
      error: result.error || "Invitation email could not be sent.",
    };
  }

  return { ok: true };
}
