import "server-only";

import { getAdminAmbassadorSpecificRequestHref } from "@/app/(protected)/admin/sessions/_data/sessions-tabs-data";
import {
  sendAmbassadorSpecificRequestAdminEmail,
  type AmbassadorSpecificRequestFormData,
} from "@/lib/resend/ambassador-specific-request-admin-email";
import { isResendConfigured } from "@/lib/resend/config";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

async function fetchSuperAdminEmails(
  supabase: SupabaseSecretClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("role", "super_admin")
    .eq("is_active", true);

  if (error) {
    console.error("[ambassador-specific-request-notify] super admins", error);
    return [];
  }

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const email = row.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return [...emails];
}

export async function notifySuperAdminsOfAmbassadorSpecificRequest(opts: {
  supabase: SupabaseSecretClient;
  requestId: number;
  form: AmbassadorSpecificRequestFormData;
}): Promise<{ ok: true } | { error: string }> {
  if (!isResendConfigured()) {
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const recipients = await fetchSuperAdminEmails(opts.supabase);
  if (recipients.length === 0) {
    console.warn(
      "[ambassador-specific-request-notify] No active super admin emails found.",
    );
    return { ok: true };
  }

  const baseUrl = await getPublicSiteBaseUrl();
  const adminRequestUrl = `${baseUrl}${getAdminAmbassadorSpecificRequestHref(opts.requestId)}`;

  const result = await sendAmbassadorSpecificRequestAdminEmail({
    to: recipients,
    requestId: opts.requestId,
    form: opts.form,
    adminRequestUrl,
  });

  if ("error" in result) {
    return {
      error:
        result.error ||
        "Could not notify super admins about this ambassador request.",
    };
  }

  return { ok: true };
}

export async function rollbackAmbassadorSpecificRequest(
  supabase: SupabaseSecretClient,
  requestId: number,
) {
  const { error } = await supabase
    .from("ambassador_specific_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    console.error("[ambassador-specific-request-notify] rollback", error);
  }
}
