import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type AuthUserMetadata = { type?: string };

export async function findAuthUserByEmail(
  service: SupabaseSecretClient,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[auth-user-lookup] listUsers", error);
      return { user: null, error: "Could not look up existing login account." as const };
    }

    const match = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (match) {
      return { user: match, error: null };
    }

    if (data.users.length < perPage) {
      return { user: null, error: null };
    }

    page += 1;
  }
}

export async function isAdvisorLoginProvisioned(
  service: SupabaseSecretClient,
  email: string,
): Promise<boolean> {
  const lookup = await findAuthUserByEmail(service, email);
  if (lookup.error || !lookup.user) return false;

  const meta = lookup.user.user_metadata as AuthUserMetadata | undefined;
  return meta?.type === "advisor";
}
