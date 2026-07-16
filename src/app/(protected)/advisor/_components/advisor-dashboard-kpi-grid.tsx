"use client";

import Link from "next/link";

import type { AdvisorDashboardKpis } from "../_lib/parse-advisor-dashboard";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

function KpiIcon({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <div
      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] ${tint}`}
    >
      {children}
    </div>
  );
}

const icons = {
  calls: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  packages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  ),
  applications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
};

type KpiCardProps = {
  href: string;
  label: string;
  value: number;
  delta: string;
  deltaClass?: string;
  icon: React.ReactNode;
  tint: string;
};

function KpiCard({ href, label, value, delta, deltaClass, icon, tint }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-[14px] border border-[#ece9e4] bg-white p-[18px_20px] transition-all duration-150 hover:-translate-y-px hover:border-[#40916C] hover:shadow-[0_4px_12px_rgba(45,106,79,0.06)]"
      style={{ fontFamily: fontSans }}
    >
      <div className="mb-[14px] flex items-center justify-between">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6a6a6a]">
          {label}
        </div>
        <KpiIcon tint={tint}>{icon}</KpiIcon>
      </div>
      <div
        className="mb-[5px] text-[30px] leading-none tracking-[-0.02em] text-[#1a1a1a]"
        style={{ fontFamily: fontSerif }}
      >
        {value}
      </div>
      <div className={`text-[11.5px] font-medium ${deltaClass ?? "text-[#6a6a6a]"}`}>{delta}</div>
    </Link>
  );
}

type Props = {
  kpis: AdvisorDashboardKpis;
};

export function AdvisorDashboardKpiGrid({ kpis }: Props) {
  const { sessionsAndCalls, newLeads, activePackages, applicationsInProgress } = kpis;

  return (
    <div className="mb-[22px] grid grid-cols-1 gap-[14px] min-[760px]:grid-cols-2 min-[1200px]:grid-cols-4">
      <KpiCard
        href="/advisor/sessions-and-calls"
        label="Sessions and Calls"
        value={sessionsAndCalls.total}
        delta={
          sessionsAndCalls.thisWeek && sessionsAndCalls.thisWeek > 0
            ? `▲ ${sessionsAndCalls.thisWeek} this week`
            : "All time"
        }
        deltaClass={
          sessionsAndCalls.thisWeek && sessionsAndCalls.thisWeek > 0
            ? "text-[#2D6A4F]"
            : undefined
        }
        icon={icons.calls}
        tint="bg-[#E8F5EE] text-[#2D6A4F]"
      />
      <KpiCard
        href="/advisor/leads"
        label="Leads"
        value={newLeads.total}
        delta={
          newLeads.awaitingFirstCall && newLeads.awaitingFirstCall > 0
            ? `${newLeads.awaitingFirstCall} awaiting first call`
            : "All leads contacted"
        }
        icon={icons.leads}
        tint="bg-[#E8F5EE] text-[#2D6A4F]"
      />
      <KpiCard
        href="/advisor/packages"
        label="Paying Customers"
        value={activePackages.total}
        delta={
          activePackages.newThisMonth && activePackages.newThisMonth > 0
            ? `▲ ${activePackages.newThisMonth} new this month`
            : "No new packages this month"
        }
        deltaClass={
          activePackages.newThisMonth && activePackages.newThisMonth > 0
            ? "text-[#2D6A4F]"
            : undefined
        }
        icon={icons.packages}
        tint="bg-[#E8F5EE] text-[#2D6A4F]"
      />
      <KpiCard
        href="/advisor/applications"
        label="Applications in progress"
        value={applicationsInProgress.total}
        delta={
          applicationsInProgress.studentCount && applicationsInProgress.studentCount > 0
            ? `across ${applicationsInProgress.studentCount} students`
            : "No active university targets"
        }
        icon={icons.applications}
        tint="bg-[#E8F5EE] text-[#2D6A4F]"
      />
    </div>
  );
}
