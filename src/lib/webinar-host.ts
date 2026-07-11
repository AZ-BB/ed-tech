export type WebinarAdvisorHost = {
  first_name: string | null;
  last_name: string | null;
  title?: string | null;
  description?: string | null;
  about?: string | null;
  avatar_url?: string | null;
} | null;

export type WebinarHostRow = {
  host_name: string | null;
  host_title: string | null;
  host_bio: string | null;
  host_image_url: string | null;
  advisors: WebinarAdvisorHost;
};

export type ResolvedWebinarHost = {
  speakerName: string;
  speakerTitle: string;
  speakerBio: string;
  speakerInitials: string;
  speakerImageUrl: string | null;
  hostLabelForEmail: string;
};

export function initialsFromFullName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function resolveWebinarHost(row: WebinarHostRow): ResolvedWebinarHost {
  const customName = row.host_name?.trim();
  if (customName) {
    return {
      speakerName: customName,
      speakerTitle: row.host_title?.trim() || "Guest Speaker",
      speakerBio: row.host_bio?.trim() || "",
      speakerInitials: initialsFromFullName(customName),
      speakerImageUrl: row.host_image_url?.trim() || null,
      hostLabelForEmail: customName,
    };
  }

  const advisor = row.advisors;
  const speakerName = advisor
    ? [advisor.first_name?.trim(), advisor.last_name?.trim()].filter(Boolean).join(" ")
    : "Advisor";

  return {
    speakerName: speakerName || "Advisor",
    speakerTitle: advisor?.title?.trim() || "Univeera Advisor",
    speakerBio: advisor?.about?.trim() || advisor?.description?.trim() || "",
    speakerInitials: initialsFromFullName(speakerName || "Advisor"),
    speakerImageUrl:
      row.host_image_url?.trim() || advisor?.avatar_url?.trim() || null,
    hostLabelForEmail: speakerName || "your advisor",
  };
}

export function displayHostName(row: WebinarHostRow): string {
  return resolveWebinarHost(row).speakerName;
}
