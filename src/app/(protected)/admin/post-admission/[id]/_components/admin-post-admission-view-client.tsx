"use client";

import {
  assignAdminPostAdmissionAdvisor,
  addAdminPostAdmissionInternalNote,
  updateAdminPostAdmissionStatus,
} from "@/actions/admin-post-admission";
import { sendPostAdmissionPaymentRequest } from "@/actions/admin-post-admission-payments";
import { logAdminPostAdmissionCall } from "@/actions/admin-post-admission-calls";
import type { AdminApplicationAdvisorOption } from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";
import {
  PostAdmissionViewClient,
  type PostAdmissionViewActions,
  type PostAdmissionViewConfig,
} from "@/components/post-admission-support/post-admission-view-client";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";

import type { AdminPostAdmissionDetailPayload } from "../_lib/fetch-admin-post-admission-detail";
import type { PostAdmissionDetailTab } from "../_lib/parse-post-admission-detail-search-params";

const ADMIN_CONFIG: PostAdmissionViewConfig = {
  backHref: "/admin/post-admission",
  backLabel: "Back to all cases",
  canAssignAdvisor: true,
  showPayoutsTab: true,
  payoutsTabVariant: "admin",
};

const ADMIN_ACTIONS: PostAdmissionViewActions = {
  updateStatus: updateAdminPostAdmissionStatus,
  addInternalNote: addAdminPostAdmissionInternalNote,
  sendPaymentRequest: sendPostAdmissionPaymentRequest,
  assignAdvisor: assignAdminPostAdmissionAdvisor,
  logCall: logAdminPostAdmissionCall,
};

export type AdminPostAdmissionViewClientProps = {
  payload: AdminPostAdmissionDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  advisorOptions: AdminApplicationAdvisorOption[];
  initialTab?: PostAdmissionDetailTab;
};

export function AdminPostAdmissionViewClient({
  payload,
  activityLogsPanel,
  advisorOptions,
  initialTab = "overview",
}: AdminPostAdmissionViewClientProps) {
  return (
    <PostAdmissionViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      advisorOptions={advisorOptions}
      initialTab={initialTab}
      config={ADMIN_CONFIG}
      actions={ADMIN_ACTIONS}
      postAdmissionPayouts={payload.postAdmissionPayouts}
      paymentSender={payload.paymentSender}
      fromEmailDisplay={payload.fromEmailDisplay}
      studentFirstName={payload.studentFirstName}
    />
  );
}
