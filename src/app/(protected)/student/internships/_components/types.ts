export type InternshipSection = "live" | "global" | "competition" | "find";

export type InternshipFormat = "in_person" | "remote" | "hybrid" | "directory";

export type InternshipPayTier = "paid" | "free" | "unpaid";

export type InternshipUrlStatus =
  | "deep_link"
  | "hub_link"
  | "news_driven"
  | "directory"
  | "homepage";

export type Internship = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  section: InternshipSection;
  countryCode: string;
  locationLabel: string;
  flag: string;
  format: InternshipFormat;
  field: string;
  payTier: InternshipPayTier;
  payLabel: string;
  duration: string;
  phone: string | null;
  nationalsOnly: boolean;
  officialUrl: string;
  urlStatus: InternshipUrlStatus;
  summary: string;
  whatYoullDo: string[];
  whatYoullGain: string[];
  eligibility: string;
  howToApply: string;
  logoColor: string;
  initials: string;
};
