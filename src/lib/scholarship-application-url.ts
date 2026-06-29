import type { Json } from "@/database.types";

export function normalizeScholarshipApplicationUrl(
  raw: string | null | undefined,
): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hostnameFromScholarshipApplicationUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

export function applicationUrlFromDiscoveryPayload(payload: Json | null): string | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const url = (payload as Record<string, unknown>).applicationUrl;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveScholarshipApplicationUrl(
  columnValue: string | null | undefined,
  discoveryPayload: Json | null,
): string {
  const fromColumn = columnValue?.trim();
  if (fromColumn) return fromColumn;
  return applicationUrlFromDiscoveryPayload(discoveryPayload) ?? "";
}

export function mergeApplicationUrlIntoDiscoveryPayload(
  existing: Json | null,
  applicationUrlRaw: string | null | undefined,
  opts?: { name?: string; slug?: string },
): Json | null {
  const applicationUrl = normalizeScholarshipApplicationUrl(applicationUrlRaw);
  const hasExistingObject =
    existing != null && typeof existing === "object" && !Array.isArray(existing);
  const base: Record<string, unknown> = hasExistingObject
    ? { ...(existing as Record<string, unknown>) }
    : {};

  const slug = opts?.slug?.trim() || "";
  if (!hasExistingObject && !applicationUrl && !slug) return null;

  if (!base.id && slug) base.id = slug;
  if (!base.name && opts?.name) base.name = opts.name;

  base.applicationUrl = applicationUrl;
  if (applicationUrl) {
    const domain = hostnameFromScholarshipApplicationUrl(applicationUrl);
    if (domain) base.applicationWebsiteDomain = domain;
    if (!base.linkStatus || base.linkStatus === "missing") base.linkStatus = "verified";
  } else if (hasExistingObject) {
    base.linkStatus = "missing";
  }

  return base as Json;
}

export function scholarshipLinkFieldsFromApplicationUrl(applicationUrl: string): {
  applicationUrl: string;
  applicationWebsiteDomain: string;
  linkStatus: "verified" | "missing";
} {
  const normalized = normalizeScholarshipApplicationUrl(applicationUrl);
  if (!normalized) {
    return {
      applicationUrl: "",
      applicationWebsiteDomain: "",
      linkStatus: "missing",
    };
  }

  return {
    applicationUrl: normalized,
    applicationWebsiteDomain: hostnameFromScholarshipApplicationUrl(normalized) ?? "",
    linkStatus: "verified",
  };
}
