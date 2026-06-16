import { fetchAdvisorSessionProfile } from "@/lib/advisor-access";

export default async function AdvisorPage() {
  const session = await fetchAdvisorSessionProfile();

  const firstName =
    session.ok ? (session.advisor.first_name?.trim() ?? "") : "";
  const displayName = session.ok
    ? [session.advisor.first_name, session.advisor.last_name]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(" ") || "Advisor"
    : "Advisor";
  const title = session.ok ? session.advisor.title?.trim() : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-sm">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#666]">
          You are signed in to the Univeera advisor portal as{" "}
          <span className="font-medium text-[#1a1a1a]">{displayName}</span>
          {title ? (
            <>
              {" "}
              (<span className="text-[#4a4a4a]">{title}</span>)
            </>
          ) : null}
          .
        </p>
        <p className="mt-4 text-[13px] leading-relaxed text-[#888]">
          Your dashboard will show upcoming sessions and account tools as they become
          available.
        </p>
      </div>
    </div>
  );
}
