export default function AdminSessionDetailLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="h-8 w-40 animate-pulse rounded bg-[#ece9e4]" />
      <div className="h-28 animate-pulse rounded-[12px] bg-[#ece9e4]" />
      <div className="h-48 animate-pulse rounded-[12px] bg-[#ece9e4]" />
      <div className="h-36 animate-pulse rounded-[12px] bg-[#ece9e4]" />
    </div>
  );
}
