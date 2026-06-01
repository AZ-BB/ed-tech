export default function AdminApplicationDetailLoading() {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-[#ece9e4]" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
        <div className="h-[420px] animate-pulse rounded-[14px] border border-[#ece9e4] bg-white" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-[14px] border border-[#ece9e4] bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
