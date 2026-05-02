export type ScholarshipCoverage = "full" | "partial";

export type ScholarshipLinkStatus = "verified" | "missing" | "uncertain" | string;

export type Scholarship = {
  id: string;
  name: string;
  provider: string;
  country: string;
  flag: string;
  type: string;
  badgeClass: string;
  eligibleNationalities: string[];
  destinations: string[];
  coverage: ScholarshipCoverage;
  coverageLabel: string;
  deadline: string;
  eligSummary: string;
  shortSummary: string;
  degreeLevels: string;
  fieldsOfStudy: string;
  academicElig: string;
  englishReq: string;
  otherElig: string;
  requiredDocs: string[];
  applicationMethod: string;
  coverageDetails: {
    tuition: string;
    stipend: string;
    travel: string;
    other: string;
  };
  importantNotes: string;
  competition: string;
  renewable: string;
  applicationUrl: string;
  applicationWebsiteName: string;
  applicationWebsiteDomain: string;
  isOfficialSource: boolean;
  linkStatus: ScholarshipLinkStatus;
  linkNotes: string;
  fallbackUrl: string;
};
