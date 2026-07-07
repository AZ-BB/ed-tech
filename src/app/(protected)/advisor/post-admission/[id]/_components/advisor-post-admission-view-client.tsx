"use client";

import {
  addAdvisorPostAdmissionInternalNote,
  updateAdvisorPostAdmissionStatus,
} from "@/actions/advisor-post-admission";
import { sendAdvisorPostAdmissionPaymentRequest } from "@/actions/advisor-post-admission-payments";
import { logAdvisorPostAdmissionCall } from "@/actions/advisor-post-admission-calls";
import {
  PostAdmissionViewClient,
  type PostAdmissionViewActions,
  type PostAdmissionViewConfig,
} from "@/components/post-admission-support/post-admission-view-client";
import type { PostAdmissionDetailTab } from "@/app/(protected)/admin/post-admission/[id]/_lib/parse-post-admission-detail-search-params";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

import type { AdvisorPostAdmissionDetailPayload } from "../_lib/fetch-advisor-post-admission-detail";

const ADVISOR_CONFIG: PostAdmissionViewConfig = {
  backHref: "/advisor/post-admission",
  backLabel: "Back to my cases",
  canAssignAdvisor: false,
  showPayoutsTab: true,
  payoutsTabVariant: "advisor",
  notesSub: "Internal notes for this post-admission case",
  activitySub: "Activity recorded for this post-admission case",
  blockPaymentRequestIfPending: true,
};

const ADVISOR_ACTIONS: PostAdmissionViewActions = {
  updateStatus: updateAdvisorPostAdmissionStatus,
  addInternalNote: addAdvisorPostAdmissionInternalNote,
  sendPaymentRequest: sendAdvisorPostAdmissionPaymentRequest,
  logCall: logAdvisorPostAdmissionCall,
};

export type AdvisorPostAdmissionViewClientProps = {
  payload: AdvisorPostAdmissionDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  initialTab?: PostAdmissionDetailTab;
};

export function AdvisorPostAdmissionViewClient({
  payload,
  activityLogsPanel,
  initialTab = "overview",
}: AdvisorPostAdmissionViewClientProps) {
  return (
    <PostAdmissionViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
      config={ADVISOR_CONFIG}
      actions={ADVISOR_ACTIONS}
      postAdmissionPayouts={payload.postAdmissionPayouts}
      payoutSummary={payload.payoutSummary}
      paymentSender={payload.paymentSender}
      fromEmailDisplay={payload.fromEmailDisplay}
      studentFirstName={payload.studentFirstName}
    />
  );
}
