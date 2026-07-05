"use client";

import {
  deleteAdvisorApplicationCall,
  logAdvisorApplicationCall,
  updateAdvisorApplicationCall,
  updateAdvisorApplicationCallStatus,
} from "@/actions/advisor-application-calls";
import {
  createAdvisorApplicationTask,
  toggleAdvisorApplicationTaskCompleted,
} from "@/actions/advisor-application-tasks";
import { sendAdvisorApplicationPaymentRequest } from "@/actions/advisor-application-payments";
import {
  toggleAdvisorApplicationPackageLifecycle,
  updateAdvisorApplicationPackageStats,
  updateAdvisorApplicationPackageUniversitiesTotal,
} from "@/actions/advisor-application-package";
import {
  createAdvisorUniversityTarget,
  searchAdvisorUniversitiesForApplication,
  updateAdvisorUniversityTarget,
  updateAdvisorUniversityTargetDecision,
  updateAdvisorUniversityTargetStatus,
} from "@/actions/advisor-application-university-targets";
import {
  addAdvisorApplicationInternalNote,
  toggleAdvisorStudentFlag,
  updateAdvisorApplicationStatus,
} from "@/actions/advisor-applications";
import {
  ApplicationViewClient,
  type ApplicationViewActions,
  type ApplicationViewConfig,
  type ApplicationDetailTab,
} from "@/components/application-support/application-view-client";
import type { AdvisorApplicationDetailPayload } from "../_lib/fetch-advisor-application-detail";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

const ADVISOR_CONFIG: ApplicationViewConfig = {
  backHref: "/advisor/applications",
  backLabel: "Back to applications",
  canAssignAdvisor: false,
  showStudentAdminLink: false,
  showSchoolAdminLink: false,
  showProfileTab: false,
  notesSub: "Internal notes for this application case",
  activitySub: "Advisor actions recorded for this application case",
  showPayoutsTab: true,
  payoutsTabVariant: "advisor",
  blockPaymentRequestIfPending: true,
  showHeaderQuickActions: true,
  documentsPortal: "advisor",
  canEditIntake: true,
};

const ADVISOR_ACTIONS: ApplicationViewActions = {
  updateStatus: updateAdvisorApplicationStatus,
  addInternalNote: addAdvisorApplicationInternalNote,
  sendPaymentRequest: sendAdvisorApplicationPaymentRequest,
  toggleStudentFlag: toggleAdvisorStudentFlag,
  calls: {
    logCall: logAdvisorApplicationCall,
    updateCall: updateAdvisorApplicationCall,
    updateCallStatus: updateAdvisorApplicationCallStatus,
    deleteCall: deleteAdvisorApplicationCall,
  },
  tasks: {
    createTask: createAdvisorApplicationTask,
    toggleTaskCompleted: toggleAdvisorApplicationTaskCompleted,
  },
  package: {
    toggleLifecycle: toggleAdvisorApplicationPackageLifecycle,
    updateStats: updateAdvisorApplicationPackageStats,
    updateUniversitiesTotal: updateAdvisorApplicationPackageUniversitiesTotal,
  },
  universityTargets: {
    searchUniversities: searchAdvisorUniversitiesForApplication,
    createTarget: createAdvisorUniversityTarget,
    updateTarget: updateAdvisorUniversityTarget,
    updateTargetStatus: updateAdvisorUniversityTargetStatus,
    updateTargetDecision: updateAdvisorUniversityTargetDecision,
  },
};

export type AdvisorApplicationViewClientProps = {
  payload: AdvisorApplicationDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  initialTab?: ApplicationDetailTab;
};

export function AdvisorApplicationViewClient({
  payload,
  activityLogsPanel,
  initialTab = "intake",
}: AdvisorApplicationViewClientProps) {
  return (
    <ApplicationViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
      config={ADVISOR_CONFIG}
      actions={ADVISOR_ACTIONS}
      applicationPayouts={payload.applicationPayouts}
      paymentRequestContext={payload.paymentRequestContext}
      intakeEdit={payload.intakeEdit}
    />
  );
}
