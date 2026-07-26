import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type AdminLessonRouteAuthResult =
  | { ok: true; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; status: number; error: string };

export async function assertAdminLessonRouteAccess(): Promise<AdminLessonRouteAuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, status: 401, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[assertAdminLessonRouteAccess] admin lookup", adminError);
    return { ok: false, status: 500, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, status: 403, error: "You do not have permission to manage lessons." };
  }

  if (admin.is_active === false) {
    return { ok: false, status: 403, error: "Your admin account is inactive." };
  }

  return { ok: true, service };
}
