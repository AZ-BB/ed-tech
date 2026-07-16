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
import {
  activateAdvisorApplicationPackage,
  createAdvisorApplicationPaymentLink,
  sendAdvisorApplicationPaymentRequest,
  sendAdvisorLeadApplicationPaymentRequest,
} from "@/actions/advisor-application-payments";
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
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import {
  resolveAdvisorApplicationBackNav,
  type AdvisorApplicationBackFrom,
} from "../_lib/advisor-application-back-nav";
import type { AdvisorApplicationDetailPayload } from "../_lib/fetch-advisor-application-detail";

const ADVISOR_ACTIONS: ApplicationViewActions = {
  updateStatus: updateAdvisorApplicationStatus,
  addInternalNote: addAdvisorApplicationInternalNote,
  sendPaymentRequest: sendAdvisorApplicationPaymentRequest,
  createPaymentLink: createAdvisorApplicationPaymentLink,
  sendLeadPaymentRequest: sendAdvisorLeadApplicationPaymentRequest,
  activatePackage: activateAdvisorApplicationPackage,
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

function buildAdvisorConfig(
  backFrom: AdvisorApplicationBackFrom | null,
): ApplicationViewConfig {
  const back = resolveAdvisorApplicationBackNav(backFrom);
  return {
    backHref: back.href,
    backLabel: back.label,
    canAssignAdvisor: false,
    showStudentAdminLink: false,
    showSchoolAdminLink: false,
    showProfileTab: false,
    notesSub: "Internal notes for this application case",
    activitySub: "Advisor actions recorded for this application case",
    showPayoutsTab: false,
    showActivityTab: false,
    payoutsTabVariant: "advisor",
    blockPaymentRequestIfPending: false,
    showHeaderQuickActions: true,
    showHeaderEditIntake: false,
    showHeaderPaymentRequest: false,
    documentsPortal: "advisor",
    canEditIntake: true,
  };
}

export type AdvisorApplicationViewClientProps = {
  payload: AdvisorApplicationDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  initialTab?: ApplicationDetailTab;
  backFrom?: AdvisorApplicationBackFrom | null;
};

export function AdvisorApplicationViewClient({
  payload,
  activityLogsPanel,
  initialTab = "intake",
  backFrom = null,
}: AdvisorApplicationViewClientProps) {
  return (
    <ApplicationViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
      config={buildAdvisorConfig(backFrom)}
      actions={ADVISOR_ACTIONS}
      applicationPayouts={payload.applicationPayouts}
      paymentRequestContext={payload.paymentRequestContext}
      intakeEdit={payload.intakeEdit}
    />
  );
}
