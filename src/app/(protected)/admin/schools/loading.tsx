export default function AdminSchoolsLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="mb-6 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-[12px] border border-[#ece9e4] bg-white"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-[#ece9e4]" />
          <div className="h-9 w-[220px] animate-pulse rounded-[8px] bg-[#ece9e4]" />
        </div>

        <div className="px-5 py-3 [zoom:0.95]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mb-2 h-12 animate-pulse rounded bg-[#f4f3f0]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
