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
  addAdvisorApplicationChecklistDocument,
  approveAdvisorApplicationChecklistDocument,
  markAdvisorApplicationChecklistNotApplicable,
  rejectAdvisorApplicationChecklistDocument,
  requestAdvisorApplicationChecklistDocument,
  uploadAdvisorApplicationChecklistDocument,
} from "@/actions/advisor-application-checklist";
import {
  toggleAdvisorApplicationPackageLifecycle,
  updateAdvisorApplicationPackageStats,
  updateAdvisorApplicationPackageUniversitiesTotal,
} from "@/actions/advisor-application-package";
import {
  clearAdvisorUniversityDocRequirementFile,
  createAdvisorUniversityTarget,
  linkAdvisorUniversityDocRequirementToChecklist,
  searchAdvisorUniversitiesForApplication,
  updateAdvisorUniversityDocRequirementStatus,
  updateAdvisorUniversityTarget,
  updateAdvisorUniversityTargetDecision,
  updateAdvisorUniversityTargetStatus,
  uploadAdvisorUniversityDocRequirement,
} from "@/actions/advisor-application-university-targets";
import {
  addAdvisorApplicationInternalNote,
  updateAdvisorApplicationAdmissionStatus,
  updateAdvisorApplicationStatus,
} from "@/actions/advisor-applications";
import {
  ApplicationViewClient,
  type ApplicationViewActions,
  type ApplicationViewConfig,
  type ApplicationDetailTab,
} from "@/components/application-support/application-view-client";
import type { ApplicationDetailPayload } from "@/lib/application-detail-mapper";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

const ADVISOR_CONFIG: ApplicationViewConfig = {
  backHref: "/advisor/applications",
  backLabel: "Back to applications",
  canAssignAdvisor: false,
  showStudentAdminLink: false,
  showSchoolAdminLink: false,
  notesSub: "Internal notes for this application case",
  showPayoutSummary: true,
};

const ADVISOR_ACTIONS: ApplicationViewActions = {
  updateStatus: updateAdvisorApplicationStatus,
  updateAdmissionStatus: updateAdvisorApplicationAdmissionStatus,
  addInternalNote: addAdvisorApplicationInternalNote,
  sendPaymentRequest: sendAdvisorApplicationPaymentRequest,
  checklist: {
    requestDocument: requestAdvisorApplicationChecklistDocument,
    approveDocument: approveAdvisorApplicationChecklistDocument,
    rejectDocument: rejectAdvisorApplicationChecklistDocument,
    markNotApplicable: markAdvisorApplicationChecklistNotApplicable,
    addDocument: addAdvisorApplicationChecklistDocument,
    uploadDocument: uploadAdvisorApplicationChecklistDocument,
  },
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
    updateDocRequirementStatus: updateAdvisorUniversityDocRequirementStatus,
    uploadDocRequirement: uploadAdvisorUniversityDocRequirement,
    linkDocRequirementToChecklist: linkAdvisorUniversityDocRequirementToChecklist,
    clearDocRequirementFile: clearAdvisorUniversityDocRequirementFile,
  },
};

export type AdvisorApplicationViewClientProps = {
  payload: ApplicationDetailPayload;
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
    />
  );
}
