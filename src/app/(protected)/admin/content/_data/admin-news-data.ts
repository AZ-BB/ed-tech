import type { Database } from "@/database.types";

type NewsTag = Database["public"]["Enums"]["news_tag"];

export const ADMIN_NEWS_TAG_OPTIONS: { value: NewsTag; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "deadline", label: "Deadline" },
  { value: "update", label: "Update" },
];

export const NEWS_TAG_VALUES = new Set<string>(ADMIN_NEWS_TAG_OPTIONS.map((o) => o.value));
