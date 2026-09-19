/** Truthy values for `?public=` on the signup page. */
export function isPublicSignupSearchParam(
  value: string | string[] | undefined,
): boolean {
  if (value === undefined) return false;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return false;
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "1" || v === "true" || v === "yes") return true;
  return false;
}

export function isPublicSignupFormFlag(value: FormDataEntryValue | null): boolean {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function buildSignupPagePath(options?: {
  code?: string;
  public?: boolean;
}): string {
  const params = new URLSearchParams();
  const code = options?.code?.trim();
  if (code) params.set("code", code);
  if (options?.public) params.set("public", "1");
  const q = params.toString();
  return q ? `/signup?${q}` : "/signup";
}

export function buildSignupPageAbsoluteUrl(
  origin: string,
  options?: { code?: string; public?: boolean },
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildSignupPagePath(options)}`;
}
