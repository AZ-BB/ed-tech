"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

async function resolveEssayPrivatePathAndAccess(
  essayId: string,
  mode: "student" | "school",
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: essay, error: essayErr } = await supabase
    .from("student_my_application_essays")
    .select("id, student_id, file_storage_path")
    .eq("id", essayId)
    .maybeSingle();

  if (essayErr || !essay?.file_storage_path) {
    return { ok: false, error: "No uploaded file for this essay." };
  }

  if (mode === "student") {
    if (essay.student_id !== user.id) {
      return { ok: false, error: "You do not have access to this essay." };
    }
  } else {
    const { data: sap } = await supabase
      .from("school_admin_profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!sap?.school_id) {
      return { ok: false, error: "Your account is not linked to a school." };
    }

    const { data: profile } = await supabase
      .from("student_profiles")
      .select("school_id")
      .eq("id", essay.student_id)
      .maybeSingle();

    if (profile?.school_id !== sap.school_id) {
      return { ok: false, error: "You do not have access to this student." };
    }
  }

  return { ok: true, path: essay.file_storage_path };
}

export async function getStudentEssayFileViewUrl(
  essayId: string,
): Promise<{ url: string } | { error: string }> {
  const res = await resolveEssayPrivatePathAndAccess(essayId, "student");
  if (!res.ok) return { error: res.error };

  const secret = await createSupabaseSecretClient();
  const { data: signed, error: signErr } = await secret.storage
    .from("student-my-applications")
    .createSignedUrl(res.path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error(signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}

export async function getSchoolEssayFileViewUrl(
  essayId: string,
): Promise<{ url: string } | { error: string }> {
  const res = await resolveEssayPrivatePathAndAccess(essayId, "school");
  if (!res.ok) return { error: res.error };

  const secret = await createSupabaseSecretClient();
  const { data: signed, error: signErr } = await secret.storage
    .from("student-my-applications")
    .createSignedUrl(res.path, 120);

  if (signErr || !signed?.signedUrl) {
    console.error(signErr);
    return { error: "Could not open the file. Try again later." };
  }

  return { url: signed.signedUrl };
}
