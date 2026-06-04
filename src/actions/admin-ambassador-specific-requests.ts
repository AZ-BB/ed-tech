"use server";

import { fetchAmbassadorsForAdminPicker } from "@/app/(protected)/admin/sessions/ambassador-requests/_lib/fetch-admin-ambassadors-picker";
import {
  mapAmbassadorRowForStudentEmail,
  sendAmbassadorSpecificRequestStudentEmail,
} from "@/lib/resend/ambassador-specific-request-student-email";
import { isResendConfigured } from "@/lib/resend/config";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdminActionResult = { ok: true } | { ok: false; error: string };

type AdminAccessResult =
  | { ok: false; error: string }
  | { ok: true; adminId: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function assertAdminAccess(): Promise<AdminAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error } = await secret
    .from("admins")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin-ambassador-specific-requests] admin lookup", error);
    return { ok: false, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false, error: "You do not have permission to manage ambassador requests." };
  }

  if (admin.is_active === false) {
    return { ok: false, error: "Your admin account is inactive." };
  }

  return { ok: true, adminId: user.id };
}

export async function getAmbassadorsForAdminPicker(input: {
  q: string;
  page: number;
  limit: number;
}) {
  const access = await assertAdminAccess();
  if (!access.ok) return { rows: [], totalRows: 0, error: access.error };

  const result = await fetchAmbassadorsForAdminPicker({
    q: input.q,
    page: input.page,
    limit: input.limit,
  });

  return { ...result, error: null as string | null };
}

async function rollbackAmbassadorSpecificRequestConfirmation(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  requestId: number,
) {
  const { error } = await secret
    .from("ambassador_specific_requests")
    .update({
      status: "pending",
      assigned_ambassador_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error(
      "[confirmAmbassadorSpecificRequest] rollback",
      error,
    );
  }
}

export async function confirmAmbassadorSpecificRequest(
  requestId: number,
  ambassadorId: string,
): Promise<AdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = Number(requestId);
  if (!Number.isFinite(id) || id < 1) {
    return { ok: false, error: "Invalid request." };
  }

  const ambassador = ambassadorId.trim();
  if (!UUID_RE.test(ambassador)) {
    return { ok: false, error: "Select a valid ambassador." };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const { data: request, error: requestError } = await secret
    .from("ambassador_specific_requests")
    .select(
      "id, status, student_name, student_email, target_university, preferred_major, additional_notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError || !request) {
    return { ok: false, error: "Ambassador request not found." };
  }

  if (request.status?.trim() !== "pending") {
    return { ok: false, error: "Only pending requests can be confirmed." };
  }

  const { data: ambassadorRow, error: ambassadorError } = await secret
    .from("ambassadors")
    .select(
      `
      id,
      first_name,
      last_name,
      major,
      university_name,
      destination_country_code,
      about,
      help_in,
      universities ( name )
    `,
    )
    .eq("id", ambassador)
    .maybeSingle();

  if (ambassadorError || !ambassadorRow) {
    return { ok: false, error: "Ambassador not found." };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await secret
    .from("ambassador_specific_requests")
    .update({
      assigned_ambassador_id: ambassador,
      status: "confirmed",
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (updateError) {
    console.error("[confirmAmbassadorSpecificRequest] update", updateError);
    return { ok: false, error: "Could not confirm this request." };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const catalogUrl = `${baseUrl}/student/ambassadors?ambassador=${encodeURIComponent(ambassador)}`;
  const ambassadorProfile = mapAmbassadorRowForStudentEmail(ambassadorRow);

  const emailResult = await sendAmbassadorSpecificRequestStudentEmail({
    to: request.student_email,
    studentName: request.student_name,
    targetUniversity: request.target_university,
    preferredMajor: request.preferred_major,
    additionalNotes: request.additional_notes,
    ambassador: ambassadorProfile,
    catalogUrl,
  });

  if ("error" in emailResult) {
    await rollbackAmbassadorSpecificRequestConfirmation(secret, id);
    return {
      ok: false,
      error: emailResult.error || "Could not send confirmation email to the student.",
    };
  }

  const ambassadorName =
    `${ambassadorRow.first_name} ${ambassadorRow.last_name}`.trim();

  const { error: logError } = await secret.from("acitivity_logs").insert({
    entitiy_type: "ambassador_specific_requests",
    entity_id: String(id),
    action: "ambassador_specific_request_confirmed",
    message: `Admin confirmed ambassador request #${id} with ${ambassadorName}.`,
    created_by_type: "admin",
    student_id: null,
    admin_id: access.adminId,
    school_admin_id: null,
  });
  if (logError) {
    console.error("[confirmAmbassadorSpecificRequest] activity log", logError);
  }

  revalidatePath("/admin/sessions/ambassador-requests");
  revalidatePath(`/admin/sessions/ambassador-requests/${id}`);

  return { ok: true };
}
