"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import type { Database } from "@/database.types";
import { fetchAdminRolePermissionTemplates, permissionsForRoleFromTemplates } from "@/lib/admin-role-permissions";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import { isResendConfigured } from "@/lib/resend/config";
import { sendStaffCredentialsEmailOrRollback } from "@/lib/staff-credentials-email";

import type { AdvisorCsvExportRow } from "@/app/(protected)/admin/users/_lib/admin-advisors-csv";
import type { AmbassadorCsvExportRow } from "@/app/(protected)/admin/users/_lib/admin-ambassadors-csv";
import type { UsersTabId } from "@/app/(protected)/admin/users/_data/users-tabs-data";
import { fetchAdminAdvisorsExportRows } from "@/app/(protected)/admin/users/_lib/fetch-admin-advisors-export";
import { fetchAdminAmbassadorsExportRows } from "@/app/(protected)/admin/users/_lib/fetch-admin-ambassadors-export";
import { fetchAdminUsersExportRows } from "@/app/(protected)/admin/users/_lib/fetch-admin-users-page";
import type { AdminUserTableRow } from "@/app/(protected)/admin/users/_lib/fetch-admin-users-page";
import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";
import type { AdminSchoolOption } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";
import type { AdminUsersPageFilters } from "@/app/(protected)/admin/users/_lib/parse-admin-users-search-params";

type AdminRole = Database["public"]["Enums"]["admin_role"];

const ADMIN_ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "super_admin", label: "Super Admin" },
];

const ADMIN_ROLE_VALUES = new Set<string>(ADMIN_ROLE_OPTIONS.map((option) => option.value));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ExportAdminUsersResult =
  | { ok: true; format: "users"; rows: AdminUserTableRow[] }
  | { ok: true; format: "ambassadors"; rows: AmbassadorCsvExportRow[] }
  | { ok: true; format: "advisors"; rows: AdvisorCsvExportRow[] }
  | { ok: false; error: string };

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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[exportAdminUsersCsv] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to export users.",
    };
  }

  return { ok: true as const };
}

export async function exportAdminUsersCsv(
  tabId: UsersTabId,
  filters: Pick<
    AdminUsersPageFilters,
    "q" | "role" | "schoolId" | "status" | "teacher"
  >,
): Promise<ExportAdminUsersResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    if (tabId === "ambassadors") {
      const rows = await fetchAdminAmbassadorsExportRows(filters.q);
      return { ok: true, format: "ambassadors", rows };
    }

    if (tabId === "advisors") {
      const rows = await fetchAdminAdvisorsExportRows(filters.q);
      return { ok: true, format: "advisors", rows };
    }

    const rows = await fetchAdminUsersExportRows(tabId, {
      q: filters.q,
      role: filters.role,
      schoolId: filters.schoolId,
      status: filters.status,
      teacher: filters.teacher ?? "",
      page: 1,
      limit: 20,
    });
    return { ok: true, format: "users", rows };
  } catch (error) {
    console.error("[exportAdminUsersCsv]", error);
    return { ok: false, error: "Could not export users." };
  }
}

type FetchAdminSchoolsResult =
  | { ok: true; schools: AdminSchoolOption[] }
  | { ok: false; error: string };

export async function fetchAdminSchoolsForStudentImport(): Promise<FetchAdminSchoolsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const schools = await fetchAdminSchoolOptions();
    return { ok: true, schools };
  } catch (error) {
    console.error("[fetchAdminSchoolsForStudentImport]", error);
    return { ok: false, error: "Could not load schools." };
  }
}


type CreateAdminUserResult = { ok: true } | { ok: false; error: string };

export async function createAdminUser(formData: FormData): Promise<CreateAdminUserResult> {
  const access = await assertAdminPermission("edit_admins");
  if (!access.ok) return access;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "").trim();

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (!ADMIN_ROLE_VALUES.has(roleRaw)) {
    return { ok: false, error: "Select a valid admin role." };
  }

  const role = roleRaw as AdminRole;
  const roleTemplates = await fetchAdminRolePermissionTemplates();
  const permissions = permissionsForRoleFromTemplates(roleTemplates, role);
  const service = await createSupabaseSecretClient();

  const { data: existingAdmin } = await service
    .from("admins")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingAdmin) {
    return { ok: false, error: "An admin with this email already exists." };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before creating admins.",
    };
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      firstName,
      lastName,
      type: "admin",
      permissions,
    },
  });

  if (authError || !authData.user) {
    console.error("[createAdminUser] auth.admin.createUser", authError);
    return { ok: false, error: authError?.message ?? "Could not create admin account." };
  }

  const { error: profileError } = await service.from("admins").insert({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    is_active: true,
  });

  if (profileError) {
    console.error("[createAdminUser] admins insert", profileError);
    await service.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: profileError.message || "Could not save admin profile." };
  }

  const emailResult = await sendStaffCredentialsEmailOrRollback({
    supabase: service,
    userId: authData.user.id,
    profileTable: "admins",
    to: email,
    firstName,
    email,
    password,
  });

  if ("error" in emailResult) {
    return { ok: false, error: emailResult.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/admins");

  return { ok: true };
}
