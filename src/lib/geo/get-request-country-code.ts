import "server-only";

import { headers } from "next/headers";

/** ISO 3166-1 alpha-2 country code from the request edge headers, if available. */
export async function getRequestCountryCode(): Promise<string | null> {
  const headerList = await headers();

  const candidates = [
    headerList.get("x-vercel-ip-country"),
    headerList.get("cf-ipcountry"),
    headerList.get("x-country-code"),
  ];

  for (const value of candidates) {
    const code = value?.trim().toUpperCase();
    if (code && code !== "XX" && /^[A-Z]{2}$/.test(code)) {
      return code;
    }
  }

  return null;
}
