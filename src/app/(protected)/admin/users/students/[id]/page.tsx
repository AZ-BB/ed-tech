import { notFound } from "next/navigation";



import { updateAdminStudentCreditLimits } from "@/actions/admin-students";

import { SchoolStudentViewClient } from "@/app/(protected)/school/students/[id]/_components/school-student-view-client";

import { fetchStudentActivityLogsPanel } from "@/app/(protected)/school/students/[id]/_lib/fetch-student-activity-logs-page";

import { fetchStudentCreditUsagePanel } from "@/app/(protected)/school/students/[id]/_lib/fetch-student-credit-usage-page";
import { fetchStudentUsageHistoryPanel } from "@/app/(protected)/school/students/[id]/_lib/fetch-student-usage-history-page";

import { parseStudentDetailInitialTab } from "@/lib/student-activity-logs";

import { parseStudentUsageHistoryKind } from "@/lib/student-usage-history";

import { createSupabaseSecretClient } from "@/utils/supabase-server";



import { fetchAdminStudentDetail } from "./_lib/fetch-admin-student-detail";

import { fetchAdminStudentTasksPage } from "./_lib/fetch-admin-student-tasks-page";

import { AdminStudentActions } from "./_components/admin-student-actions";



function parseIntParam(raw: string | string[] | undefined, fallback: number) {

  const s =

    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;

  return Number.isFinite(n) ? n : fallback;

}



type PageProps = {

  params: Promise<{ id: string }>;

  searchParams: Promise<Record<string, string | string[] | undefined>>;

};



export default async function AdminStudentDetailPage({

  params,

  searchParams,

}: PageProps) {

  const { id } = await params;

  const sp = await searchParams;



  const payload = await fetchAdminStudentDetail(id);

  if (!payload) {

    notFound();

  }



  const page = Math.max(1, parseIntParam(sp.page, 1));

  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const historyPage = Math.max(1, parseIntParam(sp.historyPage, 1));

  const historyLimit = Math.min(

    50,

    Math.max(5, parseIntParam(sp.historyLimit, 10)),

  );

  const historyKind = parseStudentUsageHistoryKind(sp.historyKind);

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));

  const activityLogsLimit = Math.min(

    50,

    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),

  );

  const usagePage = Math.max(1, parseIntParam(sp.usagePage, 1));

  const usageLimit = Math.min(50, Math.max(5, parseIntParam(sp.usageLimit, 10)));



  const secret = await createSupabaseSecretClient();



  const [{ rows, totalRows }, historyPanel, creditUsagePanel, activityLogsPanel] =

    await Promise.all([

      fetchAdminStudentTasksPage(id, { page, limit }),

      fetchStudentUsageHistoryPanel(id, historyKind, {

        page: historyPage,

        limit: historyLimit,

        client: secret,

      }),

      fetchStudentCreditUsagePanel(id, {

        page: usagePage,

        limit: usageLimit,

        client: secret,

      }),

      fetchStudentActivityLogsPanel(id, {

        page: activityLogsPage,

        limit: activityLogsLimit,

        client: secret,

      }),

    ]);



  const tabParam = typeof sp.tab === "string" ? sp.tab : "";

  const initialTab = parseStudentDetailInitialTab(tabParam);



  const {

    schoolInfo,

    student,

    applicationProfile,

    quickStats,

    platformActivity,

    shortlist,

    countries,

    studentNotes,

    advisorNotes,

    studentInteractions,

    documents,

    essays,

    recommendations,

  } = payload;



  const studentFullName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim();



  return (

    <SchoolStudentViewClient

      student={student}

      applicationProfile={applicationProfile}

      quickStats={quickStats}

      platformActivity={platformActivity}

      shortlist={shortlist}

      countries={countries}

      studentNotes={studentNotes}

      advisorNotes={advisorNotes}

      studentInteractions={studentInteractions}

      documents={documents}

      essays={essays}

      recommendations={recommendations}

      initialTab={initialTab}

      backHref="/admin/users/students"

      documentsPortal="admin"

      readOnly

      canAssignCredits

      canCreateTasks

      assignCredits={updateAdminStudentCreditLimits}

      creditAssignUsesSchoolPool={false}

      schoolInfo={schoolInfo}

      historyPanel={historyPanel}

      creditUsagePanel={creditUsagePanel}

      activityLogsPanel={activityLogsPanel}

      sidebarActions={

        <AdminStudentActions

          studentId={student.id}

          studentName={studentFullName || student.email || "Student"}

          isActive={student.isActive}

          editDefaults={{

            firstName: student.firstName,

            lastName: student.lastName,

            email: student.email,

            phone: student.phone ?? "",

            grade: student.grade ?? "",

            nationalityCountryCode: student.nationalityCountryCode ?? "",

            schoolId: student.schoolId,

            teacherId: student.teacherId,

            featureAccess: student.featureAccess,

          }}

        />

      }

      tasksPanel={{

        rows,

        totalRows,

        page,

        limit,

        q: "",

        when: "",

        priority: "",

        status: "",

      }}

    />

  );

}

