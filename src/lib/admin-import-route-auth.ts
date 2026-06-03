import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export type AdminImportAuthResult =
  | { ok: true; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; status: number; error: string };

export async function assertAdminImportAccess(): Promise<AdminImportAuthResult> {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const service = await createSupabaseSecretClient();
  const { data: adminRow } = await service.from("admins").select("id").eq("id", user.id).maybeSingle();

  if (!adminRow) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, service };
}
