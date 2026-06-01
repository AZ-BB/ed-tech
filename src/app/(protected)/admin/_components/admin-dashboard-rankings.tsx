type RankingItem = {
  label: string;
  value: string | number;
};

export function AdminDashboardRankings({
  topSchools,
  topUniversities,
  topDestinations,
}: {
  topSchools: RankingItem[];
  topUniversities: RankingItem[];
  topDestinations: RankingItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-3">
      <RankingCard title="Top Schools by Students" items={topSchools} emptyLabel="No school data yet." />
      <RankingCard
        title="Top Shortlisted Universities"
        items={topUniversities}
        emptyLabel="No shortlisted universities yet."
      />
      <RankingCard title="Top Target Countries" items={topDestinations} emptyLabel="No destination data yet." />
    </div>
  );
}

function RankingCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: RankingItem[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#ece9e4] bg-white p-5">
      <div className="mb-2 text-[13px] font-semibold text-[#1a1a1a]">{title}</div>
      {items.length === 0 ? (
        <div className="text-[12px] text-[#8a8a8a]">{emptyLabel}</div>
      ) : (
        items.map((item) => (
          <div key={item.label} className="flex items-center justify-between border-b border-[#ece9e4] py-[7px] last:border-b-0">
            <div className="pr-2 text-[12px] text-[#8a8a8a]">{item.label}</div>
            <div className="text-[12px] font-semibold text-[#4a4a4a]">{item.value}</div>
          </div>
        ))
      )}
    </div>
  );
}
