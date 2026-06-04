export {
  getResendApiKey,
  getResendFromEmail,
  isResendConfigured,
} from "@/lib/resend/config";
export { getResendClient } from "@/lib/resend/client";
export {
  sendResendEmail,
  type SendResendEmailInput,
  type SendResendEmailResult,
} from "@/lib/resend/send-email";
export {
  buildLoginPageUrl,
  buildSignupPageUrl,
  getPublicSiteBaseUrl,
} from "@/lib/resend/site-url";
export {
  sendStaffCredentialsEmail,
  type SendStaffCredentialsEmailInput,
} from "@/lib/resend/staff-credentials-email";
export {
  sendStudentSchoolInviteEmail,
  type SendStudentSchoolInviteEmailInput,
} from "@/lib/resend/student-school-invite-email";
