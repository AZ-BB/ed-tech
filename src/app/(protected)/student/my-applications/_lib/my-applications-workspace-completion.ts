import {
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  isOtherDocumentSlot,
} from "./my-applications-defaults";
import {
  getStudentApplicationProfileCompletion,
  type StudentApplicationProfileCompletionInput,
} from "@/lib/student-application-profile-completion";

export type MyApplicationsDocumentCompletionRow = {
  status: string;
  slot_key: string;
};

export type MyApplicationsWorkspaceCompletion = {
  pct: number;
  missingAreas: string[];
};

const WORKSPACE_WEIGHTS = {
  profile: 50,
  universities: 15,
  documents: 20,
  essays: 10,
  recommendations: 5,
} as const;

function isStudentUploadableDocument(slotKey: string): boolean {
  return (
    slotKey !== SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY &&
    !isOtherDocumentSlot(slotKey)
  );
}

/**
 * Student My Applications banner: blends profile completion with progress on
 * other tabs so the bar updates after shortlist, document, essay, and rec actions.
 */
export function getMyApplicationsWorkspaceCompletion(args: {
  profileInput: StudentApplicationProfileCompletionInput;
  shortlistCount: number;
  documents: MyApplicationsDocumentCompletionRow[];
  essaysCount: number;
  recommendationsCount: number;
}): MyApplicationsWorkspaceCompletion {
  const profile = getStudentApplicationProfileCompletion(args.profileInput);

  const uploadable = args.documents.filter((d) =>
    isStudentUploadableDocument(d.slot_key),
  );
  const documentsPct =
    uploadable.length > 0
      ? Math.round(
          (uploadable.filter((d) => d.status !== "missing").length /
            uploadable.length) *
            100,
        )
      : 0;

  const universitiesPct = args.shortlistCount > 0 ? 100 : 0;
  const essaysPct = args.essaysCount > 0 ? 100 : 0;
  const recommendationsPct = args.recommendationsCount > 0 ? 100 : 0;

  const pct = Math.min(
    100,
    Math.round(
      (profile.pct * WORKSPACE_WEIGHTS.profile) / 100 +
        (universitiesPct * WORKSPACE_WEIGHTS.universities) / 100 +
        (documentsPct * WORKSPACE_WEIGHTS.documents) / 100 +
        (essaysPct * WORKSPACE_WEIGHTS.essays) / 100 +
        (recommendationsPct * WORKSPACE_WEIGHTS.recommendations) / 100,
    ),
  );

  const missingAreas: string[] = [];
  if (profile.pct < 100) {
    missingAreas.push("profile");
  }
  if (universitiesPct < 100) {
    missingAreas.push("universities");
  }
  if (documentsPct < 100) {
    missingAreas.push("documents");
  }
  if (essaysPct < 100) {
    missingAreas.push("essays");
  }
  if (recommendationsPct < 100) {
    missingAreas.push("recommendations");
  }

  return { pct, missingAreas };
}

export function workspaceCompletionSubtitle(
  missingAreas: string[],
): string {
  if (missingAreas.length === 0) {
    return "Great work — your counselor has a solid picture of your application.";
  }

  const labels: Record<string, string> = {
    profile: "profile details",
    universities: "a university shortlist",
    documents: "required documents",
    essays: "at least one essay",
    recommendations: "a recommendation request",
  };

  const parts = missingAreas.map((key) => labels[key] ?? key);
  if (parts.length === 1) {
    return `Add ${parts[0]} to keep building your application.`;
  }
  const last = parts.pop();
  return `Add ${parts.join(", ")} and ${last} to keep building your application.`;
}
