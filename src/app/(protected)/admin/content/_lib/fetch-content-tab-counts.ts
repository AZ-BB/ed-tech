import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ContentTabCounts } from "../_data/content-tabs-data";

async function countTable(table: "universities" | "scholarships") {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`[admin-content] count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchContentTabCounts(): Promise<ContentTabCounts> {
  const [universities, scholarships] = await Promise.all([
    countTable("universities"),
    countTable("scholarships"),
  ]);

  return { universities, scholarships };
}
