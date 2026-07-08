import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<
  ReturnType<typeof createSupabaseSecretClient>
>;

const PAGE_SIZE = 1000;

export function slugifyInternshipName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "internship";
}

/** Pick a slug, appending -2, -3, … when base is already taken by another internship. */
export function pickUniqueInternshipSlug(
  baseSlug: string,
  usedSlugs: Set<string>,
  ownedSlug?: string | null,
): string {
  const base = baseSlug.trim();
  if (!base) return base;

  const owned = ownedSlug?.trim() || null;
  const isAvailable = (candidate: string) =>
    !usedSlugs.has(candidate) || candidate === owned;

  if (isAvailable(base)) return base;

  for (let n = 2; n <= 10_000; n++) {
    const candidate = `${base}-${n}`;
    if (isAvailable(candidate)) return candidate;
  }

  throw new Error(`Could not find a unique internship slug for "${base}"`);
}

export type InternshipSlugState = {
  usedSlugs: Set<string>;
  nameToSlug: Map<string, string>;
};

export async function loadInternshipSlugState(
  supabase: SupabaseSecretClient,
): Promise<InternshipSlugState> {
  const usedSlugs = new Set<string>();
  const nameToSlug = new Map<string, string>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("internships")
      .select("name, slug")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    for (const row of page) {
      const name = row.name?.trim();
      const slug = row.slug?.trim();
      if (slug) usedSlugs.add(slug);
      if (name) nameToSlug.set(name, slug ?? "");
    }

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { usedSlugs, nameToSlug };
}

export async function loadUsedInternshipSlugs(
  supabase: SupabaseSecretClient,
): Promise<Set<string>> {
  const { usedSlugs } = await loadInternshipSlugState(supabase);
  return usedSlugs;
}

export function assignUniqueInternshipSlug(
  baseSlug: string,
  internshipName: string,
  state: InternshipSlugState,
): string {
  const ownedRaw = state.nameToSlug.get(internshipName);
  const ownedSlug = ownedRaw && ownedRaw.length > 0 ? ownedRaw : null;
  const unique = pickUniqueInternshipSlug(baseSlug, state.usedSlugs, ownedSlug);

  state.usedSlugs.add(unique);
  state.nameToSlug.set(internshipName, unique);

  return unique;
}
