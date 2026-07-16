export type AdvisorApplicationBackFrom =
  | "leads"
  | "packages"
  | "applications";

export function parseAdvisorApplicationBackFrom(
  raw: string | string[] | undefined,
): AdvisorApplicationBackFrom | null {
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "leads" || value === "packages" || value === "applications") {
    return value;
  }
  return null;
}

export function resolveAdvisorApplicationBackNav(
  from: AdvisorApplicationBackFrom | null,
): { href: string; label: string } {
  if (from === "leads") {
    return { href: "/advisor/leads", label: "Back to leads" };
  }
  if (from === "packages") {
    return {
      href: "/advisor/packages",
      label: "Back to paying customers",
    };
  }
  return {
    href: "/advisor/applications",
    label: "Back to applications",
  };
}

export function advisorApplicationDetailHref(
  applicationId: number | string,
  options?: {
    from?: AdvisorApplicationBackFrom;
    tab?: string;
  },
): string {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.tab) params.set("tab", options.tab);
  const query = params.toString();
  return query
    ? `/advisor/applications/${applicationId}?${query}`
    : `/advisor/applications/${applicationId}`;
}
