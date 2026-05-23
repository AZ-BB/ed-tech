"use client";

import { useState } from "react";

import type { SchoolDashboardShortlistedUniversity } from "../_lib/fetch-school-dashboard";

import { SchoolShortlistedUniversitiesModal } from "./school-shortlisted-universities-modal";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

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
  seats: (
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
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

type KpiCard = {
  key: string;
  label: string;
  value: string | number;
  sub: string | null;
  helper: string;
  icon: React.ReactNode;
  tint: string;
  clickable?: boolean;
};

export type SchoolDashboardKpiGridProps = {
  studentsLimit: number | null;
  signedUpCount: number;
  activeStudentsMonth: number;
  advisorSessionsCount: number;
  studentsUsingAppSupportCount: number;
  universitiesShortlistedCount: number;
  shortlistedUniversities: SchoolDashboardShortlistedUniversity[];
};

export function SchoolDashboardKpiGrid({
  studentsLimit,
  signedUpCount,
  activeStudentsMonth,
  advisorSessionsCount,
  studentsUsingAppSupportCount,
  universitiesShortlistedCount,
  shortlistedUniversities,
}: SchoolDashboardKpiGridProps) {
  const [shortlistModalOpen, setShortlistModalOpen] = useState(false);

  const kpis: KpiCard[] = [
    {
      key: "seats",
      label: "Seats available",
      value: studentsLimit ?? "—",
      sub: null,
      helper: "student limit on your school plan",
      icon: kpiIconSvgs.seats,
      tint: "bg-[rgba(82,183,135,0.13)] text-[#1B4332]",
    },
    {
      key: "signed-up",
      label: "Students signed up",
      value: signedUpCount,
      sub: null,
      helper: "total students with accounts",
      icon: kpiIconSvgs.students,
      tint: "bg-[rgba(52,152,219,0.13)] text-[#1d4d70]",
    },
    {
      key: "active",
      label: "Active students",
      value: activeStudentsMonth,
      sub: signedUpCount > 0 ? ` / ${signedUpCount}` : null,
      helper: "active this month",
      icon: kpiIconSvgs.active,
      tint: "bg-[rgba(142,68,173,0.13)] text-[#532763]",
    },
    {
      key: "advisor",
      label: "Advisor sessions booked",
      value: advisorSessionsCount,
      sub: null,
      helper: "1:1 guidance sessions",
      icon: kpiIconSvgs.advisor,
      tint: "bg-[rgba(212,162,42,0.16)] text-[#7a5d10]",
    },
    {
      key: "support",
      label: "Students using application support",
      value: studentsUsingAppSupportCount,
      sub: null,
      helper: "active support cases",
      icon: kpiIconSvgs.support,
      tint: "bg-[rgba(38,166,154,0.13)] text-[#0e5e57]",
    },
    {
      key: "shortlist",
      label: "Universities shortlisted",
      value: universitiesShortlistedCount,
      sub: null,
      helper: "tap to view all universities",
      icon: kpiIconSvgs.unis,
      tint: "bg-[rgba(225,87,89,0.12)] text-[#8c2d22]",
      clickable: true,
    },
  ];

  return (
    <>
      <div className="mb-7 grid grid-cols-1 gap-[14px] min-[761px]:grid-cols-2 min-[1101px]:grid-cols-3">
        {kpis.map((k) => {
          const isClickable = k.clickable === true;
          const cardClassName = `group relative flex min-h-[130px] flex-col rounded-[14px] border border-[#ece9e4] bg-white px-5 pb-4 pt-[18px] transition-[border-color,box-shadow,transform] duration-150 hover:border-[#e0deda] hover:shadow-[0_1px_2px_rgba(15,30,20,0.04)]${
            isClickable
              ? " cursor-pointer hover:border-[#40916C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#40916C]"
              : ""
          }`;

          const inner = (
            <>
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
            </>
          );

          if (isClickable) {
            return (
              <button
                key={k.key}
                type="button"
                className={cardClassName}
                onClick={() => setShortlistModalOpen(true)}
                aria-label={`${k.label}: ${k.value}. Open list of shortlisted universities.`}
              >
                {inner}
              </button>
            );
          }

          return (
            <div key={k.key} className={cardClassName}>
              {inner}
            </div>
          );
        })}
      </div>

      {shortlistModalOpen ? (
        <SchoolShortlistedUniversitiesModal
          universities={shortlistedUniversities}
          onClose={() => setShortlistModalOpen(false)}
        />
      ) : null}
    </>
  );
}
