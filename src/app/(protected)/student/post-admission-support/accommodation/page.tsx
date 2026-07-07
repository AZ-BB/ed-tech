import { PostAdmissionServiceDetail } from "../_components/post-admission-service-detail";

function AccommodationIcon() {
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
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export default function AccommodationPage() {
  return (
    <PostAdmissionServiceDetail
      serviceKey="accommodation"
      heroIcon={<AccommodationIcon />}
    />
  );
}
