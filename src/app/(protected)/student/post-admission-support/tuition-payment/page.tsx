import { PostAdmissionServiceDetail } from "../_components/post-admission-service-detail";

function TuitionPaymentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="14" x2="14" y2="14" />
    </svg>
  );
}

export default function TuitionPaymentPage() {
  return (
    <PostAdmissionServiceDetail
      serviceKey="tuitionPayment"
      heroIcon={<TuitionPaymentIcon />}
    />
  );
}
