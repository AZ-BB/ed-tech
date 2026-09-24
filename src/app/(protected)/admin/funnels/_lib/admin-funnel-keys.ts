export type StaticAdminFunnelKey = "milad" | "diana" | "tariq" | "custom-with-form";
export type AdminFunnelKey = StaticAdminFunnelKey | `dynamic:${string}`;

const STATIC_FUNNEL_KEYS: StaticAdminFunnelKey[] = [
  "milad",
  "diana",
  "tariq",
  "custom-with-form",
];

export function dynamicFunnelKey(slug: string): AdminFunnelKey {
  return `dynamic:${slug.trim().toLowerCase()}`;
}

export function isDynamicFunnelKey(key: AdminFunnelKey): key is `dynamic:${string}` {
  return key.startsWith("dynamic:");
}

export function slugFromDynamicFunnelKey(key: AdminFunnelKey): string | null {
  if (!isDynamicFunnelKey(key)) return null;
  return key.slice("dynamic:".length);
}

export function isKnownAdminFunnelKey(key: AdminFunnelKey): boolean {
  if (STATIC_FUNNEL_KEYS.includes(key as StaticAdminFunnelKey)) return true;
  return isDynamicFunnelKey(key) && slugFromDynamicFunnelKey(key)!.length > 0;
}
