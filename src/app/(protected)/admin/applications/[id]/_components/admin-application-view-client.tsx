"use client";

import {
  deleteAdminApplicationCall,
  logAdminApplicationCall,
  updateAdminApplicationCall,
  updateAdminApplicationCallStatus,
} from "@/actions/admin-application-calls";
import {
  createAdminApplicationTask,
  toggleAdminApplicationTaskCompleted,
} from "@/actions/admin-application-tasks";
import { sendApplicationPaymentRequest } from "@/actions/admin-application-payments";
import {
  addAdminApplicationChecklistDocument,
  approveAdminApplicationChecklistDocument,
  markAdminApplicationChecklistNotApplicable,
  rejectAdminApplicationChecklistDocument,
  requestAdminApplicationChecklistDocument,
  uploadAdminApplicationChecklistDocument,
} from "@/actions/admin-application-checklist";
import {
  toggleAdminApplicationPackageLifecycle,
  updateAdminApplicationPackageStats,
  updateAdminApplicationPackageUniversitiesTotal,
} from "@/actions/admin-application-package";
import {
  clearAdminUniversityDocRequirementFile,
  createAdminUniversityTarget,
  linkAdminUniversityDocRequirementToChecklist,
  searchAdminUniversitiesForApplication,
  updateAdminUniversityDocRequirementStatus,
  updateAdminUniversityTarget,
  updateAdminUniversityTargetDecision,
  updateAdminUniversityTargetStatus,
  uploadAdminUniversityDocRequirement,
} from "@/actions/admin-application-university-targets";
import {
  assignAdminApplicationAdvisor,
  addAdminApplicationInternalNote,
  updateAdminApplicationAdmissionStatus,
  updateAdminApplicationStatus,
} from "@/actions/admin-applications";
import type { AdminApplicationAdvisorOption } from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";
import {
  ApplicationViewClient,
  type ApplicationViewActions,
  type ApplicationViewConfig,
} from "@/components/application-support/application-view-client";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

import type { AdminApplicationDetailPayload } from "../_lib/fetch-admin-application-detail";
import type { AdminApplicationDetailTab } from "../_lib/parse-admin-application-detail-search-params";

const ADMIN_CONFIG: ApplicationViewConfig = {
  backHref: "/admin/applications",
  backLabel: "Back to all applications",
  canAssignAdvisor: true,
  showStudentAdminLink: true,
  showSchoolAdminLink: true,
  showPayoutsTab: true,
};

const ADMIN_ACTIONS: ApplicationViewActions = {
  updateStatus: updateAdminApplicationStatus,
  updateAdmissionStatus: updateAdminApplicationAdmissionStatus,
  addInternalNote: addAdminApplicationInternalNote,
  sendPaymentRequest: sendApplicationPaymentRequest,
  assignAdvisor: assignAdminApplicationAdvisor,
  checklist: {
    requestDocument: requestAdminApplicationChecklistDocument,
    approveDocument: approveAdminApplicationChecklistDocument,
    rejectDocument: rejectAdminApplicationChecklistDocument,
    markNotApplicable: markAdminApplicationChecklistNotApplicable,
    addDocument: addAdminApplicationChecklistDocument,
    uploadDocument: uploadAdminApplicationChecklistDocument,
  },
  calls: {
    logCall: logAdminApplicationCall,
    updateCall: updateAdminApplicationCall,
    updateCallStatus: updateAdminApplicationCallStatus,
    deleteCall: deleteAdminApplicationCall,
  },
  tasks: {
    createTask: createAdminApplicationTask,
    toggleTaskCompleted: toggleAdminApplicationTaskCompleted,
  },
  package: {
    toggleLifecycle: toggleAdminApplicationPackageLifecycle,
    updateStats: updateAdminApplicationPackageStats,
    updateUniversitiesTotal: updateAdminApplicationPackageUniversitiesTotal,
  },
  universityTargets: {
    searchUniversities: searchAdminUniversitiesForApplication,
    createTarget: createAdminUniversityTarget,
    updateTarget: updateAdminUniversityTarget,
    updateTargetStatus: updateAdminUniversityTargetStatus,
    updateTargetDecision: updateAdminUniversityTargetDecision,
    updateDocRequirementStatus: updateAdminUniversityDocRequirementStatus,
    uploadDocRequirement: uploadAdminUniversityDocRequirement,
    linkDocRequirementToChecklist: linkAdminUniversityDocRequirementToChecklist,
    clearDocRequirementFile: clearAdminUniversityDocRequirementFile,
  },
};

export type AdminApplicationViewClientProps = {
  payload: AdminApplicationDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  advisorOptions: AdminApplicationAdvisorOption[];
  initialTab?: AdminApplicationDetailTab;
};

export function AdminApplicationViewClient({
  payload,
  activityLogsPanel,
  advisorOptions,
  initialTab = "intake",
}: AdminApplicationViewClientProps) {
  return (
    <ApplicationViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      advisorOptions={advisorOptions}
      initialTab={initialTab}
      config={ADMIN_CONFIG}
      actions={ADMIN_ACTIONS}
      applicationPayouts={payload.applicationPayouts}
    />
  );
}
