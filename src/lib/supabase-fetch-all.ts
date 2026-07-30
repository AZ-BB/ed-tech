import type { PostgrestError } from "@supabase/supabase-js";

export const SUPABASE_FETCH_ALL_BATCH_SIZE = 100;

export async function fetchSupabaseAllRows<T>(
  fetchBatch: (
    from: number,
    to: number,
  ) => Promise<{ data: unknown; error: PostgrestError | null }>,
  options?: { batchSize?: number },
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const batchSize = options?.batchSize ?? SUPABASE_FETCH_ALL_BATCH_SIZE;
  const all: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchBatch(offset, offset + batchSize - 1);
    if (error) return { data: all, error };

    const batch = (data ?? []) as T[];
    all.push(...batch);

    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return { data: all, error: null };
}
