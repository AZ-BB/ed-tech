import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_ROLE_DEFAULT_PERMISSIONS = {
  super_admin: [
    "edit_students",
    "edit_teachers",
    "edit_advisors",
    "edit_ambassadors",
    "edit_admins",
    "edit_permissions",
    "edit_system_default",
    "edit_system_features",
    "edit_system_plans",
    "edit_applications",
    "edit_documents",
    "edit_schools",
    "edit_sessions",
  ],
  admin: [
    "edit_students",
    "edit_teachers",
    "edit_advisors",
    "edit_ambassadors",
    "edit_system_default",
    "edit_system_features",
    "edit_system_plans",
    "edit_applications",
    "edit_documents",
    "edit_schools",
    "edit_sessions",
  ],
  moderator: [
    "edit_students",
    "edit_applications",
    "edit_documents",
    "edit_sessions",
  ],
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

const supabase = createServerClient(supabaseUrl, serviceKey, {
  cookies: {
    getAll() {
      return [];
    },
    setAll() {},
  },
});

async function loadRoleTemplates() {
  const keys = {
    super_admin: "role_permissions_super_admin",
    admin: "role_permissions_admin",
    moderator: "role_permissions_moderator",
  };

  const { data, error } = await supabase
    .from("system")
    .select("key, value")
    .in("key", Object.values(keys));

  if (error) {
    console.warn("Could not load role templates from system table, using defaults.");
    return ADMIN_ROLE_DEFAULT_PERMISSIONS;
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const templates = { ...ADMIN_ROLE_DEFAULT_PERMISSIONS };

  for (const [role, key] of Object.entries(keys)) {
    const raw = byKey.get(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        templates[role] = parsed;
      }
    } catch {
      // keep default
    }
  }

  return templates;
}

function permissionsForRole(role, templates) {
  return templates[role] ?? templates.admin;
}

function hasStoredPermissions(metadata) {
  const raw = metadata?.permissions;
  return Array.isArray(raw) && raw.length > 0;
}

async function main() {
  const roleTemplates = await loadRoleTemplates();

  const { data: admins, error } = await supabase
    .from("admins")
    .select("id, role, email");

  if (error) {
    console.error("Failed to load admins:", error.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const admin of admins ?? []) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(admin.id);

    if (authError || !authData.user) {
      console.warn(`Skip ${admin.email ?? admin.id}: auth user not found`);
      skipped += 1;
      continue;
    }

    const metadata = authData.user.user_metadata ?? {};

    if (hasStoredPermissions(metadata)) {
      skipped += 1;
      continue;
    }

    const role = admin.role?.trim() || "admin";
    const permissions = permissionsForRole(role, roleTemplates);
    const nextMetadata = {
      ...metadata,
      type: metadata.type ?? "admin",
      permissions,
    };

    if (dryRun) {
      console.log(`[dry-run] ${admin.email ?? admin.id} (${role}) -> ${permissions.join(", ")}`);
      updated += 1;
      continue;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(admin.id, {
      user_metadata: nextMetadata,
    });

    if (updateError) {
      console.error(`Failed ${admin.email ?? admin.id}:`, updateError.message);
      continue;
    }

    console.log(`Updated ${admin.email ?? admin.id} (${role})`);
    updated += 1;
  }

  console.log(`Done. updated=${updated} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
