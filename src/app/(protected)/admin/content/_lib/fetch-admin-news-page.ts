import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type NewsTag = Database["public"]["Enums"]["news_tag"];

export type AdminNewsTableRow = {
  id: number;
  tag: NewsTag;
  text: string;
  createdAt: string | null;
};

export async function fetchAdminNewsPage(): Promise<AdminNewsTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("news_items")
    .select("id, tag, text, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminNewsPage]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tag: row.tag,
    text: row.text?.trim() ?? "",
    createdAt: row.created_at ?? null,
  }));
}
