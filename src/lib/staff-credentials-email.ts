import "server-only";

import { isResendConfigured } from "@/lib/resend/config";
import { buildLoginPageUrl } from "@/lib/resend/site-url";
import { sendStaffCredentialsEmail } from "@/lib/resend/staff-credentials-email";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type StaffProfileTable = "admins" | "school_admin_profiles";

export async function sendStaffCredentialsEmailOrRollback(opts: {
  supabase: SupabaseSecretClient;
  userId: string;
  profileTable: StaffProfileTable;
  to: string;
  firstName: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!isResendConfigured()) {
    await rollbackStaffAccount(opts.supabase, opts.userId, opts.profileTable);
    return {
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const loginUrl = await buildLoginPageUrl();
  const result = await sendStaffCredentialsEmail({
    to: opts.to,
    firstName: opts.firstName,
    email: opts.email,
    password: opts.password,
    loginUrl,
  });

  if ("error" in result) {
    await rollbackStaffAccount(opts.supabase, opts.userId, opts.profileTable);
    return {
      error: result.error || "Credentials email could not be sent.",
    };
  }

  return { ok: true };
}

async function rollbackStaffAccount(
  supabase: SupabaseSecretClient,
  userId: string,
  profileTable: StaffProfileTable,
) {
  const { error: profileError } = await supabase
    .from(profileTable)
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("[staff-credentials-email] profile rollback", profileError);
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("[staff-credentials-email] auth rollback", authError);
  }
}
