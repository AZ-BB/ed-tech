/** PostgREST `or()` filter matching English and Arabic program discovery text fields. */
export function programDiscoverySearchOrFilter(query: string): string {
  const q = query.trim();
  if (!q) return "";

  const englishFields = [
    `title.ilike.%${q}%`,
    `slug.ilike.%${q}%`,
    `category.ilike.%${q}%`,
    `short_description.ilike.%${q}%`,
  ];

  const arabicFields = [
    `content_ar->>title.ilike.%${q}%`,
    `content_ar->>category.ilike.%${q}%`,
    `content_ar->>short_description.ilike.%${q}%`,
    `content_ar->>description.ilike.%${q}%`,
  ];

  return [...englishFields, ...arabicFields].join(",");
}
