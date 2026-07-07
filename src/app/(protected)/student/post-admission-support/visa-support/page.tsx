import { PostAdmissionServiceDetail } from "../_components/post-admission-service-detail";

function VisaSupportIcon() {
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
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </svg>
  );
}

export default function VisaSupportPage() {
  return (
    <PostAdmissionServiceDetail
      serviceKey="visaSupport"
      heroIcon={<VisaSupportIcon />}
    />
  );
}
