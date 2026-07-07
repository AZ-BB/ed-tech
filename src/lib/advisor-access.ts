import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdvisorAccessResult =
  | {
      ok: true;
      advisorId: string;
      advisorName: string;
      email: string;
    }
  | { ok: false; error: string };

export async function resolveCurrentAdvisorId(
  supabase: SupabaseServerClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return null;

  const meta = user.user_metadata as { type?: string } | undefined;
  if (meta?.type !== "advisor") return null;

  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  // Advisors are linked by email, not auth.uid(); use service client for lookup
  // (same as login validation in auth.ts). Application reads still use RLS.
  const secret = await createSupabaseSecretClient();
  const { data: advisor, error } = await secret
    .from("advisors")
    .select("id, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[resolveCurrentAdvisorId]", error);
    return null;
  }

  if (!advisor || advisor.is_active === false) return null;

  return advisor.id;
}

export type AdvisorSessionProfile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  title: string | null;
  is_active: boolean;
};

export async function fetchAdvisorSessionProfile(): Promise<
  | { ok: true; advisor: AdvisorSessionProfile; email: string }
  | { ok: false; reason: "unsigned" | "wrong_type" | "no_email" | "no_profile" | "inactive" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, reason: "unsigned" };
  }

  const meta = user.user_metadata as { type?: string } | undefined;
  if (meta?.type !== "advisor") {
    return { ok: false, reason: "wrong_type" };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return { ok: false, reason: "no_email" };
  }

  const secret = await createSupabaseSecretClient();
  const { data: advisor, error } = await secret
    .from("advisors")
    .select("id, first_name, last_name, avatar_url, title, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorSessionProfile]", error);
    return { ok: false, reason: "no_profile" };
  }

  if (!advisor) {
    return { ok: false, reason: "no_profile" };
  }

  if (advisor.is_active === false) {
    return { ok: false, reason: "inactive" };
  }

  return {
    ok: true,
    advisor: {
      id: advisor.id,
      first_name: advisor.first_name,
      last_name: advisor.last_name,
      avatar_url: advisor.avatar_url,
      title: advisor.title,
      is_active: advisor.is_active ?? true,
    },
    email,
  };
}

export type AdvisorContext =
  | { advisorId: string; email: string }
  | { error: string };

export async function requireAdvisorContext(): Promise<AdvisorContext> {
  const access = await assertAdvisorAccess();
  if (!access.ok) {
    return { error: access.error };
  }
  return { advisorId: access.advisorId, email: access.email };
}

export async function assertAdvisorAccess(): Promise<AdvisorAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const meta = user.user_metadata as { type?: string } | undefined;
  if (meta?.type !== "advisor") {
    return { ok: false, error: "You do not have permission to access the advisor portal." };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Your account has no email address." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: advisor, error: advisorError } = await secret
    .from("advisors")
    .select("id, first_name, last_name, email, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (advisorError) {
    console.error("[assertAdvisorAccess] advisor lookup", advisorError);
    return { ok: false, error: "Could not verify advisor access." };
  }

  if (!advisor) {
    return { ok: false, error: "Advisor profile not found." };
  }

  if (advisor.is_active === false) {
    return { ok: false, error: "Your advisor account is inactive." };
  }

  const advisorName =
    [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() ||
    advisor.email?.trim() ||
    "Advisor";

  return {
    ok: true,
    advisorId: advisor.id,
    advisorName,
    email: advisor.email?.trim() || email,
  };
}

export async function assertAdvisorAssignedApplication(
  advisorId: string,
  applicationId: number,
): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();
  const { data: application, error } = await secret
    .from("applications")
    .select("id, student_id, assigned_to")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("[assertAdvisorAssignedApplication]", error);
    return { ok: false, error: "Could not verify application access." };
  }

  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  if (application.assigned_to !== advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  return { ok: true, studentId: application.student_id };
}

export async function assertAdvisorAssignedPostAdmissionCase(
  advisorId: string,
  caseId: number,
): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();
  const { data: caseRow, error } = await secret
    .from("post_admission_cases")
    .select("id, student_id, assigned_to")
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    console.error("[assertAdvisorAssignedPostAdmissionCase]", error);
    return { ok: false, error: "Could not verify post-admission access." };
  }

  if (!caseRow) {
    return { ok: false, error: "Post-admission case not found." };
  }

  if (caseRow.assigned_to !== advisorId) {
    return { ok: false, error: "You do not have access to this case." };
  }

  return { ok: true, studentId: caseRow.student_id };
}
