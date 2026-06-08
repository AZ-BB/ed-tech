import { formatDistanceToNow } from "date-fns";

import {
  buildOrWithStudentIds,
  fetchSchoolStudentIdsByQuery,
  orIlikeClause,
} from "@/app/(protected)/school/_lib/student-search";
import { RECOMMENDATION_STATUSES } from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export type SchoolDocumentTableRow = {
  rowKind: "checklist" | "recommendation";
  documentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email: string;
  documentName: string;
  description: string | null;
  isUploaded: boolean;
  recommendationStatus?: RecommendationStatus;
  sentToName?: string;
  sentToEmail?: string;
  forApplication?: string;
  updatedIso: string;
  updatedLabel: string;
};

export type SchoolDocumentsPageFilters = {
  q: string;
  /** Navbar student name/email filter */
  studentQ: string;
  /** "" | "missing" | "uploaded" */
  status: string;
  page: number;
  limit: number;
};

type StudentProfileEmbed = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type DocQueryRow = {
  id: string;
  student_id: string;
  display_name: string;
  description: string | null;
  status: string;
  storage_path: string | null;
  updated_at: string;
  student_profiles: StudentProfileEmbed;
};

type RecQueryRow = {
  id: string;
  student_id: string;
  teacher_name: string;
  teacher_email: string;
  teacher_subject: string | null;
  for_application: string;
  status: string;
  letter_storage_path: string | null;
  updated_at: string;
  student_profiles: StudentProfileEmbed;
};

type SchoolSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type SharedFilterContext = {
  supabase: SchoolSupabase;
  schoolId: string;
  qTrim: string;
  studentQTrim: string;
  docStatus: "" | "missing" | "uploaded";
  navbarStudentIds: string[] | null;
  searchStudentIds: string[];
};

const CHECKLIST_DATA_SELECT = `
  id,
  student_id,
  display_name,
  description,
  status,
  storage_path,
  updated_at,
  student_profiles!inner (
    first_name,
    last_name,
    email,
    avatar_url,
    school_id
  )
`;

const RECOMMENDATION_DATA_SELECT = `
  id,
  student_id,
  teacher_name,
  teacher_email,
  teacher_subject,
  for_application,
  status,
  letter_storage_path,
  updated_at,
  student_profiles!inner (
    first_name,
    last_name,
    email,
    avatar_url,
    school_id
  )
`;

function isUploadedRow(status: string, storagePath: string | null): boolean {
  if (storagePath) return true;
  return status === "submitted";
}

function updatedLabelFromIso(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function normalizeDocStatus(raw: string): "" | "missing" | "uploaded" {
  if (raw === "missing" || raw === "uploaded") return raw;
  return "";
}

function studentFieldsFromEmbed(sp: StudentProfileEmbed | undefined) {
  return {
    firstName: sp?.first_name?.trim() ?? "",
    lastName: sp?.last_name?.trim() ?? "",
    avatarUrl: sp?.avatar_url?.trim() || null,
    email: sp?.email?.trim() ?? "",
  };
}

function mapChecklistRow(d: DocQueryRow): SchoolDocumentTableRow {
  const sp = d.student_profiles;
  const uploaded = isUploadedRow(d.status, d.storage_path);
  return {
    rowKind: "checklist",
    documentId: d.id,
    studentId: d.student_id,
    ...studentFieldsFromEmbed(sp),
    documentName: d.display_name,
    description: d.description,
    isUploaded: uploaded,
    updatedIso: d.updated_at,
    updatedLabel: updatedLabelFromIso(d.updated_at),
  };
}

function mapRecommendationRow(r: RecQueryRow): SchoolDocumentTableRow {
  const sp = r.student_profiles;
  const subject = r.teacher_subject?.trim();
  const sentToName = `${r.teacher_name}${subject ? ` (${subject})` : ""}`;
  const status = r.status as RecommendationStatus;

  return {
    rowKind: "recommendation",
    documentId: r.id,
    studentId: r.student_id,
    ...studentFieldsFromEmbed(sp),
    documentName: "Recommendation letter",
    description: r.for_application ? `For: ${r.for_application}` : null,
    isUploaded: status === "submitted",
    recommendationStatus: status,
    sentToName,
    sentToEmail: r.teacher_email,
    forApplication: r.for_application,
    updatedIso: r.updated_at,
    updatedLabel: updatedLabelFromIso(r.updated_at),
  };
}

function mergeRowsByUpdatedAt(
  a: SchoolDocumentTableRow[],
  b: SchoolDocumentTableRow[],
): SchoolDocumentTableRow[] {
  const merged = [...a, ...b];
  merged.sort((x, y) => {
    const byTime = y.updatedIso.localeCompare(x.updatedIso);
    if (byTime !== 0) return byTime;
    return y.documentId.localeCompare(x.documentId);
  });
  return merged;
}

function applyStudentScope<T extends { in: (column: string, values: string[]) => T }>(
  query: T,
  studentIds: string[] | null,
): T | null {
  if (!studentIds) return query;
  if (studentIds.length === 0) return null;
  return query.in("student_id", studentIds);
}

async function buildSharedFilterContext(
  supabase: SchoolSupabase,
  schoolId: string,
  filters: SchoolDocumentsPageFilters,
): Promise<SharedFilterContext | null> {
  const qTrim = filters.q.trim();
  const studentQTrim = filters.studentQ.trim();
  const docStatus = normalizeDocStatus(filters.status);

  let navbarStudentIds: string[] | null = null;
  if (studentQTrim) {
    navbarStudentIds = await fetchSchoolStudentIdsByQuery(
      supabase,
      schoolId,
      studentQTrim,
    );
    if (navbarStudentIds.length === 0) {
      return null;
    }
  }

  const searchStudentIds = qTrim
    ? await fetchSchoolStudentIdsByQuery(supabase, schoolId, qTrim)
    : [];

  return {
    supabase,
    schoolId,
    qTrim,
    studentQTrim,
    docStatus,
    navbarStudentIds,
    searchStudentIds,
  };
}

export async function fetchSchoolDocumentsPage(
  filters: SchoolDocumentsPageFilters,
): Promise<{
  rows: SchoolDocumentTableRow[];
  totalRows: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { rows: [], totalRows: 0 };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) {
    return { rows: [], totalRows: 0 };
  }

  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;
  const fetchLimit = offset + limit;

  const ctx = await buildSharedFilterContext(supabase, schoolId, filters);
  if (!ctx) {
    return { rows: [], totalRows: 0 };
  }

  let checklistCountQuery = ctx.supabase
    .from("student_my_application_documents")
    .select("id, student_profiles!inner(school_id)", {
      count: "exact",
      head: true,
    })
    .eq("student_profiles.school_id", ctx.schoolId);

  let checklistDataQuery = ctx.supabase
    .from("student_my_application_documents")
    .select(CHECKLIST_DATA_SELECT)
    .eq("student_profiles.school_id", ctx.schoolId);

  let recommendationCountQuery = ctx.supabase
    .from("student_my_application_recommendations")
    .select("id, student_profiles!inner(school_id)", {
      count: "exact",
      head: true,
    })
    .eq("student_profiles.school_id", ctx.schoolId);

  let recommendationDataQuery = ctx.supabase
    .from("student_my_application_recommendations")
    .select(RECOMMENDATION_DATA_SELECT)
    .eq("student_profiles.school_id", ctx.schoolId);

  const scopedChecklistCount = applyStudentScope(
    checklistCountQuery,
    ctx.navbarStudentIds,
  );
  const scopedChecklistData = applyStudentScope(
    checklistDataQuery,
    ctx.navbarStudentIds,
  );
  const scopedRecommendationCount = applyStudentScope(
    recommendationCountQuery,
    ctx.navbarStudentIds,
  );
  const scopedRecommendationData = applyStudentScope(
    recommendationDataQuery,
    ctx.navbarStudentIds,
  );

  if (
    !scopedChecklistCount ||
    !scopedChecklistData ||
    !scopedRecommendationCount ||
    !scopedRecommendationData
  ) {
    return { rows: [], totalRows: 0 };
  }

  checklistCountQuery = scopedChecklistCount;
  checklistDataQuery = scopedChecklistData;
  recommendationCountQuery = scopedRecommendationCount;
  recommendationDataQuery = scopedRecommendationData;

  if (ctx.qTrim) {
    const docFieldPatterns = orIlikeClause(
      ["display_name", "description"],
      ctx.qTrim,
    ).split(",");
    const docSearchFilter = buildOrWithStudentIds(
      docFieldPatterns,
      ctx.searchStudentIds,
    );
    checklistCountQuery = checklistCountQuery.or(docSearchFilter);
    checklistDataQuery = checklistDataQuery.or(docSearchFilter);

    const recFieldPatterns = orIlikeClause(
      ["teacher_name", "teacher_email", "for_application"],
      ctx.qTrim,
    ).split(",");
    const recSearchFilter = buildOrWithStudentIds(
      recFieldPatterns,
      ctx.searchStudentIds,
    );
    recommendationCountQuery = recommendationCountQuery.or(recSearchFilter);
    recommendationDataQuery = recommendationDataQuery.or(recSearchFilter);
  }

  if (ctx.docStatus === "missing") {
    checklistCountQuery = checklistCountQuery
      .is("storage_path", null)
      .neq("status", "submitted");
    checklistDataQuery = checklistDataQuery
      .is("storage_path", null)
      .neq("status", "submitted");
    recommendationCountQuery = recommendationCountQuery.in("status", [
      "pending",
      "drafting",
    ]);
    recommendationDataQuery = recommendationDataQuery.in("status", [
      "pending",
      "drafting",
    ]);
  } else if (ctx.docStatus === "uploaded") {
    checklistCountQuery = checklistCountQuery.or(
      "status.eq.submitted,storage_path.not.is.null",
    );
    checklistDataQuery = checklistDataQuery.or(
      "status.eq.submitted,storage_path.not.is.null",
    );
    recommendationCountQuery = recommendationCountQuery.eq("status", "submitted");
    recommendationDataQuery = recommendationDataQuery.eq("status", "submitted");
  }

  const [
    checklistCountRes,
    recommendationCountRes,
    checklistDataRes,
    recommendationDataRes,
  ] = await Promise.all([
    checklistCountQuery,
    recommendationCountQuery,
    checklistDataQuery
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, Math.max(0, fetchLimit - 1)),
    recommendationDataQuery
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, Math.max(0, fetchLimit - 1)),
  ]);

  if (checklistCountRes.error) {
    console.error("[fetchSchoolDocumentsPage] checklist count", checklistCountRes.error);
  }
  if (recommendationCountRes.error) {
    console.error(
      "[fetchSchoolDocumentsPage] recommendation count",
      recommendationCountRes.error,
    );
  }
  if (checklistDataRes.error) {
    console.error("[fetchSchoolDocumentsPage] checklist data", checklistDataRes.error);
  }
  if (recommendationDataRes.error) {
    console.error(
      "[fetchSchoolDocumentsPage] recommendation data",
      recommendationDataRes.error,
    );
  }

  const totalRows =
    (checklistCountRes.count ?? 0) + (recommendationCountRes.count ?? 0);

  const checklistRows = (checklistDataRes.data ?? []).map((raw) =>
    mapChecklistRow(raw as DocQueryRow),
  );
  const recommendationRows = (recommendationDataRes.data ?? []).map((raw) =>
    mapRecommendationRow(raw as RecQueryRow),
  );

  const rows = mergeRowsByUpdatedAt(checklistRows, recommendationRows).slice(
    offset,
    offset + limit,
  );

  return { rows, totalRows };
}
