"use server";

import {
  logPostAdmissionCallCore,
  parsePostAdmissionCaseId,
  type LogPostAdmissionCallInput,
} from "@/lib/post-admission-calls-actions-core";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/admin/post-admission");
  revalidatePath(`/admin/post-admission/${caseId}`);
}

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return { ok: false as const, error: "You do not have permission." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return {
    ok: true as const,
    userId: user.id,
    actorName:
      [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Admin",
  };
}

export async function logAdminPostAdmissionCall(
  input: Omit<LogPostAdmissionCallInput, "caseId"> & { caseId: string },
) {
  const admin = await assertAdminAccess();
  if (!admin.ok) return admin;

  const caseId = parsePostAdmissionCaseId(input.caseId);
  if (caseId == null) return { ok: false as const, error: "Invalid case." };

  const secret = await createSupabaseSecretClient();
  const result = await logPostAdmissionCallCore(
    secret,
    {
      caseId,
      callType: input.callType,
      durationMinutes: input.durationMinutes,
      callDate: input.callDate,
      status: input.status,
      outcome: input.outcome,
      summary: input.summary,
    },
    {
      userId: admin.userId,
      actorName: admin.actorName,
      authorRole: "admin",
      adminId: admin.userId,
    },
  );

  if (result.ok) revalidatePostAdmissionPaths(caseId);
  return result;
}
