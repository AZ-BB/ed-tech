"use client";

import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const ADVISOR_HOME = "/advisor";
const ADVISOR_LEADS = "/advisor/leads";
const ADVISOR_STUDENTS = "/advisor/students";
const ADVISOR_PACKAGES = "/advisor/packages";
const ADVISOR_PAYMENTS = "/advisor/payments";
const ADVISOR_TASKS = "/advisor/tasks";
const ADVISOR_APPLICATIONS = "/advisor/applications";
const ADVISOR_SETTINGS = "/advisor/settings";

export type AdvisorPortalShellProps = {
  displayName: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  title?: string | null;
  children: React.ReactNode;
};

function SidebarProfileAvatar({
  avatarUrl,
  avatarInitials,
}: {
  avatarUrl?: string | null;
  avatarInitials: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-2 ring-[#52B788]/40"
      />
    );
  }

  return (
    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#52B788] text-[13px] font-bold leading-none text-[#1B4332]">
      {avatarInitials}
    </div>
  );
}

export function AdvisorPortalShell({
  displayName,
  avatarInitials,
  avatarUrl = null,
  title = null,
  children,
}: AdvisorPortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const dashboardActive =
    pathname === ADVISOR_HOME || pathname === `${ADVISOR_HOME}/`;

  const packagesActive =
    pathname === ADVISOR_PACKAGES || pathname.startsWith(`${ADVISOR_PACKAGES}/`);

  const leadsActive =
    pathname === ADVISOR_LEADS || pathname.startsWith(`${ADVISOR_LEADS}/`);

  const studentsActive =
    pathname === ADVISOR_STUDENTS || pathname.startsWith(`${ADVISOR_STUDENTS}/`);

  const paymentsActive =
    pathname === ADVISOR_PAYMENTS || pathname.startsWith(`${ADVISOR_PAYMENTS}/`);

  const tasksActive =
    pathname === ADVISOR_TASKS || pathname.startsWith(`${ADVISOR_TASKS}/`);

  const applicationsActive =
    pathname === ADVISOR_APPLICATIONS ||
    pathname.startsWith(`${ADVISOR_APPLICATIONS}/`);

  const settingsActive =
    pathname === ADVISOR_SETTINGS || pathname.startsWith(`${ADVISOR_SETTINGS}/`);

  const pageTitle = settingsActive
    ? "My Profile"
    : paymentsActive
    ? "Payment Requests"
    : tasksActive
      ? "Tasks"
      : studentsActive
        ? pathname.startsWith(`${ADVISOR_STUDENTS}/`) &&
          pathname !== ADVISOR_STUDENTS
          ? "Student"
          : "My Students"
        : leadsActive
          ? "New Leads"
          : packagesActive
            ? "Active Packages"
            : applicationsActive
              ? pathname.startsWith(`${ADVISOR_APPLICATIONS}/`) &&
                pathname !== ADVISOR_APPLICATIONS
                ? "Application"
                : "Applications"
              : "Dashboard";

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", esc);
    };
  }, [sidebarOpen]);

  const sidebarMobileClass = sidebarOpen
    ? "max-[760px]:translate-x-0 max-[760px]:shadow-[4px_0_24px_rgba(0,0,0,0.18)]"
    : "max-[760px]:-translate-x-full";

  return (
    <div
      className="min-h-screen bg-[#f4f3f0] text-[#1a1a1a] antialiased"
      style={{ fontFamily: fontSans }}
    >
      <div
        role="presentation"
        className={`fixed inset-0 z-[95] bg-[rgba(15,30,20,0.45)] transition-opacity duration-[250ms] max-[760px]:block lg:hidden ${
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />

      <aside
        id="advisor-sidebar"
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[240px] flex-col overflow-hidden bg-[#1B4332] transition-transform duration-[250ms] lg:translate-x-0 ${sidebarMobileClass}`}
      >
        <div className="flex shrink-0 items-center gap-[10px] border-b border-white/[0.08] px-[22px] pb-[22px] pt-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.12] text-sm font-bold leading-none text-white">
            U
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-bold tracking-[-0.01em] text-white">
              Univeera
            </span>
            <span className="text-[10.5px] font-medium uppercase leading-tight tracking-[0.06em] text-[rgba(255,255,255,0.45)]">
              Advisor
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-[14px]">
          <div className="px-[22px] pb-[6px] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.4)]">
            Navigate
          </div>
          <nav className="flex flex-col gap-px px-[10px]">
            <Link
              href={ADVISOR_HOME}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                dashboardActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Dashboard</span>
            </Link>
            <Link
              href={ADVISOR_LEADS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                leadsActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <span>New Leads</span>
            </Link>
            <Link
              href={ADVISOR_STUDENTS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                studentsActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span>My Students</span>
            </Link>
            <Link
              href={ADVISOR_PACKAGES}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                packagesActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Active Packages</span>
            </Link>
            <Link
              href={ADVISOR_APPLICATIONS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                applicationsActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              <span>Applications</span>
            </Link>
            <Link
              href={ADVISOR_TASKS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                tasksActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <span>Tasks</span>
            </Link>
            <Link
              href={ADVISOR_PAYMENTS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                paymentsActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Payment Requests</span>
            </Link>
          </nav>

          <div className="mt-[14px] px-[22px] pb-[6px] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.4)]">
            Account
          </div>
          <nav className="flex flex-col gap-px px-[10px]">
            <Link
              href={ADVISOR_SETTINGS}
              prefetch={false}
              onClick={closeSidebar}
              className={`group flex cursor-pointer items-center gap-[11px] rounded-[8px] px-[12px] py-[9px] text-[13.5px] font-medium text-[rgba(255,255,255,0.7)] transition-all duration-[150ms] hover:bg-white/[0.06] hover:text-white ${
                settingsActive
                  ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[#52B788]"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[16px] w-[16px] shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>My Profile</span>
            </Link>
          </nav>
        </div>

        <div className="shrink-0 border-t border-white/[0.08] bg-[#1B4332] px-[18px] py-[14px]">
          <div className="flex items-center gap-[10px]">
            <Link
              href={ADVISOR_SETTINGS}
              prefetch={false}
              onClick={closeSidebar}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B788] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B4332]"
              title="Account settings"
              aria-label="Account settings"
            >
              <SidebarProfileAvatar avatarUrl={avatarUrl} avatarInitials={avatarInitials} />
            </Link>
            <Link
              href={ADVISOR_SETTINGS}
              prefetch={false}
              onClick={closeSidebar}
              className="min-w-0 flex-1 py-1 text-left hover:opacity-90"
              title="Account settings"
            >
              <div
                className="truncate text-[13px] font-semibold leading-tight text-white"
                title={displayName}
              >
                {displayName || "Advisor"}
              </div>
              <div className="truncate text-[11px] leading-tight text-white/50">
                {title?.trim() || "Advisor"}
              </div>
            </Link>
            <button
              type="button"
              title="Sign out"
              aria-label="Sign out"
              className="flex cursor-pointer rounded-[6px] bg-transparent p-[6px] text-[rgba(255,255,255,0.5)] transition-colors hover:bg-white/[0.08] hover:text-white"
              onClick={() => setLogoutConfirmOpen(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-[240px]">
        <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[#ece9e4] bg-white px-4 py-[14px] max-[760px]:px-4 lg:px-[32px]">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              className="-ml-0.5 flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-[1.5px] border-[#ece9e4] bg-[#faf9f4] transition-all duration-[150ms] hover:border-[#40916C] hover:bg-[#f0f7f2] lg:hidden"
              onClick={openSidebar}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="advisor-sidebar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4a4a4a"
                strokeWidth="2"
              >
                <path d="M4 12h16M4 6h16M4 18h16" />
              </svg>
            </button>
            <div className="flex min-w-0 flex-col gap-[2px] pt-0.5 lg:pt-0">
              <div className="text-[11.5px] font-medium uppercase leading-none tracking-[0.06em] text-[#a0a0a0]">
                Advisor Portal
              </div>
              <h1
                className="text-[24px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                style={{ fontFamily: fontSerif }}
              >
                {pageTitle}
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 max-[760px]:px-4 max-[760px]:py-4 lg:px-[32px] lg:py-6">
          {children}
        </main>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        variant="school"
      />
    </div>
  );
}
