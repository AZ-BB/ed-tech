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
  buildPasswordResetVerifyUrl,
  buildResetPasswordPageUrl,
  buildSignupPageUrl,
  getPublicSiteBaseUrl,
} from "@/lib/resend/site-url";
export {
  sendPasswordResetEmail,
  type SendPasswordResetEmailInput,
} from "@/lib/resend/password-reset-email";
export {
  sendApplicationPaymentRequestEmail,
  type SendApplicationPaymentRequestEmailInput,
} from "@/lib/resend/application-payment-request-email";
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
