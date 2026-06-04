import { assertAdminPermission } from "@/lib/assert-admin-permission";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type AdminDocumentRouteAuthResult =
  | { ok: true; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; status: number; error: string };

export async function assertAdminDocumentEditRouteAccess(): Promise<AdminDocumentRouteAuthResult> {
  const access = await assertAdminPermission("edit_documents");
  if (!access.ok) {
    const status =
      access.error === "You must be signed in." ? 401 : 403;
    return { ok: false, status, error: access.error };
  }

  const service = await createSupabaseSecretClient();
  return { ok: true, service };
}

export async function assertAdminDocumentViewRouteAccess(): Promise<AdminDocumentRouteAuthResult> {
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
    console.error("[assertAdminDocumentViewRouteAccess] admin lookup", adminError);
    return { ok: false, status: 500, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, status: 403, error: "You do not have permission to view documents." };
  }

  if (admin.is_active === false) {
    return { ok: false, status: 403, error: "Your admin account is inactive." };
  }

  return { ok: true, service };
}
