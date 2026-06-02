export default function AdminReportsLoading() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] animate-pulse rounded-[12px] border border-[#ece9e4] bg-white"
        />
      ))}
      <div className="col-span-full h-[220px] animate-pulse rounded-[12px] border border-[#ece9e4] bg-white sm:col-span-2 xl:col-span-4" />
    </div>
  );
}
