import Link from "next/link";

import type { SchoolDashboardPayload } from "../_lib/fetch-school-dashboard";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

type Props = {
  data: SchoolDashboardPayload;
};

function KpiIcon({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <div
      className={`absolute right-4 top-4 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] transition-transform duration-150 group-hover:scale-105 ${tint}`}
    >
      {children}
    </div>
  );
}

const kpiIconSvgs = {
  students: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  active: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  advisor: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  amb: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  support: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M9 11l3 3L22 4" />
    </svg>
  ),
  unis: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
};

const btnGhostClassName =
  "inline-flex cursor-pointer items-center gap-[5px] rounded-[6px] border-[1.5px] border-[#e0deda] bg-white px-[10px] py-[5px] text-[11.5px] font-semibold leading-none text-[#4a4a4a] transition-all duration-[150ms] hover:border-[#40916C] hover:bg-[#f0f7f2] hover:text-[#1B4332]";

export function SchoolDashboard({ data }: Props) {
  const {
    totalStudents,
    activeStudents30d,
    advisorSessionsCount,
    ambassadorSessionsCount,
    studentsUsingAppSupportCount,
    universitiesShortlistedCount,
    attention,
    topDestinations,
    topPrograms,
  } = data;

  const kpis = [
    {
      label: "Total students",
      value: totalStudents,
      sub: null as string | null,
      helper: "enrolled in your school",
      icon: kpiIconSvgs.students,
      tint: "bg-[rgba(82,183,135,0.13)] text-[#1B4332]",
    },
    {
      label: "Active students",
      value: activeStudents30d,
      sub: ` / ${totalStudents}`,
      helper: "active this month",
      icon: kpiIconSvgs.active,
      tint: "bg-[rgba(52,152,219,0.13)] text-[#1d4d70]",
    },
    {
      label: "Advisor sessions booked",
      value: advisorSessionsCount,
      sub: null,
      helper: "1:1 guidance sessions",
      icon: kpiIconSvgs.advisor,
      tint: "bg-[rgba(142,68,173,0.13)] text-[#532763]",
    },
    {
      label: "Ambassador sessions booked",
      value: ambassadorSessionsCount,
      sub: null,
      helper: "student/alumni conversations",
      icon: kpiIconSvgs.amb,
      tint: "bg-[rgba(212,162,42,0.16)] text-[#7a5d10]",
    },
    {
      label: "Students using application support",
      value: studentsUsingAppSupportCount,
      sub: null,
      helper: "active support cases",
      icon: kpiIconSvgs.support,
      tint: "bg-[rgba(38,166,154,0.13)] text-[#0e5e57]",
    },
    {
      label: "Universities shortlisted",
      value: universitiesShortlistedCount,
      sub: null,
      helper: "discovery shortlist (unique student–university)",
      icon: kpiIconSvgs.unis,
      tint: "bg-[rgba(225,87,89,0.12)] text-[#8c2d22]",
    },
  ];

  const destMax = Math.max(1, ...topDestinations.map((d) => d.count));
  const progMax = Math.max(1, ...topPrograms.map((p) => p.count));

  return (
    <div style={{ fontFamily: fontSans }}>
      <div className="mb-6 max-[760px]:mb-6">
        <h1
          className="mb-1.5 text-[30px] font-normal leading-[1.15] tracking-[-0.01em] text-[#1a1a1a] max-[760px]:text-2xl"
          style={{ fontFamily: fontSerif }}
        >
          School Counseling Dashboard
        </h1>
        <p className="max-w-[720px] text-[14px] leading-[1.5] text-[#6a6a6a] max-[760px]:text-[13px]">
          Track student engagement, university planning, advisor usage, and
          application support across your school.
        </p>
      </div>

      <div className="mb-7 grid grid-cols-1 gap-[14px] min-[761px]:grid-cols-2 min-[1101px]:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="group relative flex min-h-[130px] flex-col rounded-[14px] border border-[#ece9e4] bg-white px-5 pb-4 pt-[18px] transition-[border-color,box-shadow,transform] duration-150 hover:border-[#e0deda] hover:shadow-[0_1px_2px_rgba(15,30,20,0.04)]"
          >
            <KpiIcon tint={k.tint}>{k.icon}</KpiIcon>
            <div className="mb-[14px] pr-[42px] text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.07em] text-[#6a6a6a]">
              {k.label}
            </div>
            <div
              className="mb-auto text-[38px] font-normal leading-none tracking-[-0.02em] text-[#1a1a1a]"
              style={{ fontFamily: fontSerif }}
            >
              {k.value}
              {k.sub ? (
                <sub
                  className="ml-px align-baseline text-[15px] font-normal tracking-normal text-[#a0a0a0]"
                  style={{ fontFamily: fontSans }}
                >
                  {k.sub}
                </sub>
              ) : null}
            </div>
            {k.helper ? (
              <div className="mt-[14px] border-t border-[#ece9e4] pt-3 text-[11.5px] font-normal tracking-[0.005em] text-[#6a6a6a]">
                {k.helper}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] min-[1101px]:grid-cols-[1.5fr_1fr]">
        <div className="mb-[18px] overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white min-[1101px]:mb-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-[18px]">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#E8F5EE] text-[#2D6A4F]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-[13px] w-[13px]"
                    aria-hidden
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                  </svg>
                </span>
                Students needing counselor follow-up
              </div>
              <p className="mt-[2px] text-[12px] leading-none text-[#6a6a6a]">
                Flagged based on activity, missing items, or application progress.
              </p>
            </div>
            <Link href="/school/students" className={btnGhostClassName} style={{ fontFamily: fontSans }}>
              View all
            </Link>
          </div>
          <div className="px-5 py-[18px]">
            {attention.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-[#6a6a6a]">
                <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7f2] text-[#2D6A4F]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                All students on track
              </div>
            ) : (
              <div>
                {attention.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-4 border-b border-[#ece9e4] py-[14px] first:pt-[6px] last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[11.5px] font-semibold text-[#1B4332]">
                        {row.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold tracking-[-0.005em] text-[#1a1a1a]">
                          {row.firstName} {row.lastName}
                          {row.grade ? (
                            <span className="text-[11.5px] font-normal text-[#a0a0a0]">
                              {" "}
                              · {row.grade}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-[3px] max-w-[320px] text-[12px] leading-[1.45] text-[#4a4a4a]">
                          {row.issue}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-[5px] rounded-full px-[10px] py-[3px] text-[11.5px] font-semibold leading-[1.4] ${
                          row.riskClass === "red"
                            ? "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
                            : "bg-[rgba(212,162,42,.14)] text-[#7a5d10]"
                        }`}
                      >
                        <span
                          className={`h-[6px] w-[6px] rounded-full ${
                            row.riskClass === "red" ? "bg-[#E74C3C]" : "bg-[#D4A22A]"
                          }`}
                        />
                        {row.riskLabel}
                      </span>
                      <Link
                        href={`/school/students/${row.id}`}
                        className="cursor-pointer whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[12px] font-semibold tracking-[0.005em] text-[#1B4332] transition-colors duration-[120ms] hover:bg-[#f0f7f2]"
                        style={{ fontFamily: fontSans }}
                      >
                        Open profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-[18px]">
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">Offer highlights</div>
              <p className="mt-[2px] text-[12px] text-[#6a6a6a]">Recent university offers across your cohort.</p>
            </div>
            <Link href="/school/applications" className={btnGhostClassName} style={{ fontFamily: fontSans }}>
              View all
            </Link>
          </div>
          <div className="p-0">
            <div className="px-5 py-10 text-center text-[13px] text-[#6a6a6a]">
              <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7f2] text-[#2D6A4F]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              No offers yet. They&apos;ll appear here as your students hear back.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] min-[1101px]:grid-cols-2">
        <div className="overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white">
          <div className="border-b border-[#ece9e4] px-5 py-[18px]">
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#E8F5EE] text-[#2D6A4F]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-[13px] w-[13px]"
                  aria-hidden
                >
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2a8 8 0 00-8 8c0 4.5 8 14 8 14s8-9.5 8-14a8 8 0 00-8-8z" />
                </svg>
              </span>
              Top intended destinations
            </div>
          </div>
          <div className="px-5 py-[18px]">
            {topDestinations.length === 0 ? (
              <p className="text-center text-[13px] text-[#6a6a6a]">No destination data yet.</p>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {topDestinations.map((d, i) => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between border-b border-[#ece9e4] py-[10px] last:border-b-0"
                  >
                    <div className="flex items-center gap-[10px]">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[#f0f7f2] text-[10.5px] font-bold tracking-[0.02em] text-[#1B4332]">
                        {i + 1}
                      </div>
                      <span className="text-[13px] font-medium tracking-[-0.005em] text-[#1a1a1a]">{d.label}</span>
                    </div>
                    <div className="flex items-center gap-[10px]">
                      <div className="h-[4px] w-[72px] overflow-hidden rounded-[2px] bg-[#ece9e4]">
                        <div
                          className="h-full rounded-[2px] bg-[#2D6A4F] transition-[width] duration-300 ease-out"
                          style={{ width: `${(d.count / destMax) * 100}%` }}
                        />
                      </div>
                      <span className="min-w-[22px] text-right text-[12px] font-semibold tracking-[0.005em] text-[#4a4a4a]">
                        {d.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white">
          <div className="border-b border-[#ece9e4] px-5 py-[18px]">
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#E8F5EE] text-[#2D6A4F]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-[13px] w-[13px]"
                  aria-hidden
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              Most popular universities
            </div>
          </div>
          <div className="px-5 py-[18px]">
            {topPrograms.length === 0 ? (
              <p className="text-center text-[13px] text-[#6a6a6a]">No university data yet.</p>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {topPrograms.map((p, i) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between border-b border-[#ece9e4] py-[10px] last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-[10px]">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[#f0f7f2] text-[10.5px] font-bold tracking-[0.02em] text-[#1B4332]">
                        {i + 1}
                      </div>
                      <span className="truncate text-[13px] font-medium tracking-[-0.005em] text-[#1a1a1a]">
                        {p.label}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-[10px]">
                      <div className="h-[4px] w-[72px] overflow-hidden rounded-[2px] bg-[#ece9e4]">
                        <div
                          className="h-full rounded-[2px] bg-[#2D6A4F] transition-[width] duration-300 ease-out"
                          style={{ width: `${(p.count / progMax) * 100}%` }}
                        />
                      </div>
                      <span className="min-w-[22px] text-right text-[12px] font-semibold tracking-[0.005em] text-[#4a4a4a]">
                        {p.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
