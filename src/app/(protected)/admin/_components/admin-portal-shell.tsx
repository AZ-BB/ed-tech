"use client";

import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ADMIN_HOME,
  ADMIN_PAGE_TITLE_BY_PATH,
  adminNavSections,
} from "../_data/admin-nav-data";
import { AdminDashboardHeaderActions } from "./admin-dashboard-header-actions";
import { AdminApplicationsHeaderActions } from "../applications/_components/admin-applications-header-actions";
import { ContentHeaderActions } from "../content/_components/content-header-actions";
import {
  isAdminContentListPath,
  isAdminContentPath,
  isAdminScholarshipDetailPath,
  isAdminUniversityDetailPath,
} from "../content/_data/content-tabs-data";
import { UsersHeaderActions } from "../users/_components/users-header-actions";
import { SchoolsHeaderActions } from "../schools/_components/admin-schools-header-actions";
import { isAdminUserDetailPath, isAdminUsersPath } from "../users/_data/users-tabs-data";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;
const fontSerif = '"DM Serif Display", Georgia, serif' as const;

export type AdminPortalShellProps = {
  displayName: string;
  avatarInitials: string;
  userRole?: string;
  children: React.ReactNode;
};

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

const ADMIN_SCHOOLS = `${ADMIN_HOME}/schools`;
const ADMIN_APPLICATIONS = `${ADMIN_HOME}/applications`;

function isAdminSchoolsPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_SCHOOLS || n.startsWith(`${ADMIN_SCHOOLS}/`);
}

function isAdminApplicationsPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return n === ADMIN_APPLICATIONS || n.startsWith(`${ADMIN_APPLICATIONS}/`);
}

function isAdminApplicationDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return /^\/admin\/applications\/\d+$/.test(n);
}

function isAdminSchoolDetailPath(pathname: string): boolean {
  const n = normalizePath(pathname);
  return /^\/admin\/schools\/[^/]+$/.test(n);
}

function pageTitle(pathname: string): string {
  const n = normalizePath(pathname);
  if (isAdminUsersPath(n)) return "User Management";
  if (isAdminSchoolsPath(n)) return "School Management";
  if (isAdminContentPath(n)) return "Content Management";
  if (ADMIN_PAGE_TITLE_BY_PATH[n]) return ADMIN_PAGE_TITLE_BY_PATH[n];
  for (const [path, title] of Object.entries(ADMIN_PAGE_TITLE_BY_PATH)) {
    if (path !== ADMIN_HOME && n.startsWith(`${path}/`)) return title;
  }
  if (n.startsWith(`${ADMIN_HOME}/`)) {
    const last = n.split("/").pop();
    if (last)
      return last.slice(0, 1).toUpperCase() + last.slice(1).replace(/-/g, " ");
  }
  return "Dashboard";
}

function navLinkActive(pathname: string, href: string): boolean {
  const n = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === ADMIN_HOME) return n === ADMIN_HOME;
  return n === h || n.startsWith(`${h}/`);
}

export function AdminPortalShell({
  displayName,
  avatarInitials,
  userRole = "Admin",
  children,
}: AdminPortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const title = useMemo(() => pageTitle(pathname ?? ADMIN_HOME), [pathname]);
  const dashboardHome = useMemo(
    () => normalizePath(pathname ?? ADMIN_HOME) === ADMIN_HOME,
    [pathname],
  );
  const dashboardMonthLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [],
  );
  const usersSection = useMemo(
    () => isAdminUsersPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const schoolsSection = useMemo(() => {
    const n = pathname ?? ADMIN_HOME;
    return isAdminSchoolsPath(n) && !isAdminSchoolDetailPath(n);
  }, [pathname]);
  const contentSection = useMemo(() => {
    const n = pathname ?? ADMIN_HOME;
    return isAdminContentListPath(n);
  }, [pathname]);
  const applicationsSection = useMemo(() => {
    const n = pathname ?? ADMIN_HOME;
    return isAdminApplicationsPath(n) && !isAdminApplicationDetailPath(n);
  }, [pathname]);
  const userDetailPage = useMemo(
    () => isAdminUserDetailPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const schoolDetailPage = useMemo(
    () => isAdminSchoolDetailPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const applicationDetailPage = useMemo(
    () => isAdminApplicationDetailPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const universityDetailPage = useMemo(
    () => isAdminUniversityDetailPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const scholarshipDetailPage = useMemo(
    () => isAdminScholarshipDetailPath(pathname ?? ADMIN_HOME),
    [pathname],
  );
  const detailPage =
    userDetailPage ||
    schoolDetailPage ||
    applicationDetailPage ||
    universityDetailPage ||
    scholarshipDetailPage;

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

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
        id="admin-sidebar"
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[240px] flex-col overflow-y-auto bg-[#1B4332] transition-transform duration-[250ms] lg:translate-x-0 ${sidebarMobileClass}`}
      >
        <div className="flex items-center gap-[10px] border-b border-white/[0.08] px-5 pb-4 pt-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.12] text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white">Univeera</span>
          <span className="ml-1 rounded-[10px] bg-[rgba(82,183,136,0.15)] px-[7px] py-[2px] text-[9px] font-semibold uppercase leading-none text-[#52B788]">
            Admin
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {adminNavSections.map((sec) => (
            <div key={sec.title}>
              <div className="px-3 pb-2 pt-4 text-[9px] font-bold uppercase tracking-[1.5px] text-white/30">
                {sec.title}
              </div>
              <nav className="flex flex-col">
                {sec.links.map((link) => {
                  const active = pathname
                    ? navLinkActive(pathname, link.href)
                    : false;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      onClick={closeSidebar}
                      className={`mx-2 my-px flex cursor-pointer items-center gap-[10px] rounded-[8px] px-4 py-[9px] text-[13px] font-medium text-white/55 transition-all duration-150 hover:bg-white/[0.06] hover:text-white/85 ${
                        active
                          ? "bg-white/10 font-semibold text-white"
                          : ""
                      }`}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-[10px] px-2 py-[10px]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-[11px] font-bold text-white">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[12px] font-semibold text-white/80"
                title={displayName}
              >
                {displayName || "Admin"}
              </div>
              <div className="text-[10px] text-white/[0.35]">{userRole}</div>
            </div>
            <button
              type="button"
              title="Sign out"
              aria-label="Sign out"
              className="flex shrink-0 cursor-pointer rounded-[6px] bg-transparent p-[6px] text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/85"
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
        <header
          className={`sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[#ece9e4] bg-white px-4 py-4 max-[760px]:px-4 lg:gap-[10px] lg:px-7 ${detailPage ? "lg:hidden" : ""}`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 lg:gap-3">
            <button
              type="button"
              className="-ml-0.5 flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-[1.5px] border-[#ece9e4] bg-[#faf9f4] transition-all duration-150 hover:border-[#40916C] hover:bg-[#f0f7f2] lg:hidden"
              onClick={openSidebar}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
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
            {!detailPage ? (
              <div className="flex min-w-0 flex-col gap-0.5 pt-0.5 lg:pt-0">
                {usersSection ? (
                  <>
                    <h1
                      className="text-[20px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      {title}
                    </h1>
                    <p className="text-[12px] text-[#a0a0a0]">
                      Manage all platform users
                    </p>
                  </>
                ) : schoolsSection ? (
                  <>
                    <h1
                      className="text-[20px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      {title}
                    </h1>
                    <p className="text-[12px] text-[#a0a0a0]">
                      Manage schools, codes, and billing
                    </p>
                  </>
                ) : contentSection ? (
                  <>
                    <h1
                      className="text-[20px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      {title}
                    </h1>
                    <p className="text-[12px] text-[#a0a0a0]">
                      Universities, scholarships, announcements
                    </p>
                  </>
                ) : applicationsSection ? (
                  <>
                    <h1
                      className="text-[20px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      Application Support
                    </h1>
                    <p className="text-[12px] text-[#a0a0a0]">
                      Case management and document tracking
                    </p>
                  </>
                ) : dashboardHome ? (
                  <>
                    <h1
                      className="text-[20px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      Dashboard
                    </h1>
                    <p className="text-[12px] text-[#a0a0a0]">
                      Platform overview - {dashboardMonthLabel}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-[11.5px] font-medium uppercase leading-none tracking-[0.06em] text-[#a0a0a0]">
                      Platform Admin
                    </div>
                    <h1
                      className="text-[24px] leading-[1.2] tracking-[-0.01em] text-[#1a1a1a]"
                      style={{ fontFamily: fontSerif }}
                    >
                      {title}
                    </h1>
                  </>
                )}
              </div>
            ) : null}
          </div>
          {!detailPage ? (
            <>
              {schoolsSection ? <SchoolsHeaderActions /> : null}
              {contentSection ? <ContentHeaderActions /> : null}
              {applicationsSection ? <AdminApplicationsHeaderActions /> : null}
              {dashboardHome ? <AdminDashboardHeaderActions /> : null}
              {usersSection &&
              !dashboardHome &&
              !schoolsSection &&
              !contentSection &&
              !applicationsSection ? (
                <UsersHeaderActions />
              ) : null}
            </>
          ) : null}
        </header>

        <main
          className={`flex-1 px-4 py-6 max-[760px]:px-4 max-[760px]:py-4 lg:px-[32px] lg:py-6 ${detailPage ? "lg:px-6 lg:pt-4" : ""}`}
        >
          {children}
        </main>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        variant="admin"
      />
    </div>
  );
}
