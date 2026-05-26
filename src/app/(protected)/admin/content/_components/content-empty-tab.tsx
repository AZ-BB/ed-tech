export type ContentEmptyTabProps = {
  title: string;
};

export function ContentEmptyTab({ title }: ContentEmptyTabProps) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-16 text-center">
      <h2 className="text-[14px] font-bold text-[#1a1a1a]">{title}</h2>
      <p className="mt-2 text-[13px] text-[#a0a0a0]">Coming soon</p>
    </div>
  );
}
