import "server-only";

import type { Locale } from "./config";
import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";

const dictionaries = { en, ar } as const;

export type Dictionary = typeof en | typeof ar;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale];
}
