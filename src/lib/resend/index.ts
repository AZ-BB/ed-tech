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
  buildApplicationPaymentUrl,
  buildLoginPageUrl,
  buildRecommendationSubmitUrl,
  buildSignupPageUrl,
  getPublicSiteBaseUrl,
} from "@/lib/resend/site-url";
export {
  sendApplicationPaymentRequestEmail,
  type SendApplicationPaymentRequestEmailInput,
} from "@/lib/resend/application-payment-request-email";
export {
  sendPostAdmissionPaymentRequestEmail,
  type SendPostAdmissionPaymentRequestEmailInput,
} from "@/lib/resend/post-admission-payment-request-email";
export {
  formatRecommendationDeadline,
  sendRecommendationRequestEmail,
  type SendRecommendationRequestEmailInput,
} from "@/lib/resend/recommendation-request-email";
export {
  sendAmbassadorSpecificRequestAdminEmail,
  type AmbassadorSpecificRequestFormData,
  type SendAmbassadorSpecificRequestAdminEmailInput,
} from "@/lib/resend/ambassador-specific-request-admin-email";
export {
  sendStaffCredentialsEmail,
  type SendStaffCredentialsEmailInput,
} from "@/lib/resend/staff-credentials-email";
export {
  sendStudentSchoolInviteEmail,
  type SendStudentSchoolInviteEmailInput,
} from "@/lib/resend/student-school-invite-email";
