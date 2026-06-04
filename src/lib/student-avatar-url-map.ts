import type { createSupabaseServerClient } from "@/utils/supabase-server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function normalizeAvatarUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t || null;
}

export async function fetchStudentAvatarUrlMap(
  client: SupabaseClient,
  studentIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const ids = [...new Set(studentIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const chunkSize = 150;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await client
      .from("student_profiles")
      .select("id, avatar_url")
      .in("id", chunk);

    if (error) {
      console.error("[fetchStudentAvatarUrlMap]", error.message);
      continue;
    }

    for (const row of data ?? []) {
      map.set(row.id, normalizeAvatarUrl(row.avatar_url));
    }
  }

  return map;
}
