import { PostAdmissionServiceDetail } from "../_components/post-admission-service-detail";

function ScholarshipIcon() {
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
      <circle cx="12" cy="8" r="6" />
      <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
    </svg>
  );
}

export default function ScholarshipSearchPage() {
  return (
    <PostAdmissionServiceDetail
      serviceKey="scholarshipSearch"
      heroIcon={<ScholarshipIcon />}
    />
  );
}
