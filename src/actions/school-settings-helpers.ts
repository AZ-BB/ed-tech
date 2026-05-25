"use server";

import { SCHOOL_DEACTIVATED_LOGIN_MESSAGE, isSchoolActive } from "@/lib/school-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function requireSchoolAdminContext(): Promise<
  | { userId: string; schoolId: string }
  | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "You must be signed in." };
  }

  const { data: sap, error } = await supabase
    .from("school_admin_profiles")
    .select("school_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[school-settings] school_admin_profiles", error);
    return { error: "Could not load your school admin profile." };
  }

  if (!sap?.school_id) {
    return { error: "Your account is not linked to a school." };
  }

  if (sap.is_active === false) {
    return { error: "Your account has been deactivated. Please contact support." };
  }

  const schoolActive = await isSchoolActive(sap.school_id);
  if (schoolActive === false) {
    return { error: SCHOOL_DEACTIVATED_LOGIN_MESSAGE };
  }

  return { userId: user.id, schoolId: sap.school_id };
}
