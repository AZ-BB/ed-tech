"use client";

import { logout } from "@/actions/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SchoolPortalShellProps = {
  schoolName: string;
  displayName: string;
  avatarInitials: string;
  userRole?: string;
  children: React.ReactNode;
};

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

const SCHOOL_HOME = "/school";

const PAGE_TITLE_BY_PATH: Record<string, string> = {
  [SCHOOL_HOME]: "Dashboard",
  "/school/students": "Students",
  "/school/applications": "Applications",
  "/school/documents": "Documents",
  "/school/tasks": "Tasks",
  "/school/reports": "Reports",
  "/school/webinars": "Webinars",
  "/school/settings": "Settings",
};

function pageTitle(pathname: string): string {
  const n = normalizePath(pathname);
  if (PAGE_TITLE_BY_PATH[n]) return PAGE_TITLE_BY_PATH[n];
  for (const [path, title] of Object.entries(PAGE_TITLE_BY_PATH)) {
    if (path !== SCHOOL_HOME && n.startsWith(`${path}/`)) return title;
  }
  if (n.startsWith(`${SCHOOL_HOME}/`)) {
    const last = n.split("/").pop();
    if (last)
      return last.slice(0, 1).toUpperCase() + last.slice(1).replace(/-/g, " ");
  }
  return "Dashboard";
}

type NavSvgProps = React.SVGProps<SVGSVGElement> & {
  paths: React.ReactNode;
};

function NavSvg({ paths, ...rest }: NavSvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-white/50 transition-colors group-hover:text-inherit group-[.sidebar-link-active]:text-inherit"
      aria-hidden
      {...rest}
    >
      {paths}
    </svg>
  );
}

const navSections: {
  title: string;
  className?: string;
  links: readonly { href: string; label: string; icon: React.ReactNode }[];
}[] = [
  {
    title: "Navigate",
    links: [
      {
        href: SCHOOL_HOME,
        label: "Dashboard",
        icon: (
          <NavSvg
            paths={
              <>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/students`,
        label: "Students",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/applications`,
        label: "Applications",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/documents`,
        label: "Documents",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <path d="M13 2v7h7" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/tasks`,
        label: "Tasks",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/reports`,
        label: "Reports",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-5" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    title: "Resources",
    className: "mt-3.5",
    links: [
      {
        href: `${SCHOOL_HOME}/webinars`,
        label: "Webinars",
        icon: (
          <NavSvg
            paths={
              <>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </>
            }
          />
        ),
      },
      {
        href: `${SCHOOL_HOME}/settings`,
        label: "Settings",
        icon: (
          <NavSvg
            paths={
              <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </>
            }
          />
        ),
      },
    ],
  },
];

function navLinkActive(pathname: string, href: string): boolean {
  const n = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === SCHOOL_HOME) return n === SCHOOL_HOME;
  return n === h || n.startsWith(`${h}/`);
}

export function SchoolPortalShell({
  schoolName,
  displayName,
  avatarInitials,
  userRole = "School administrator",
  children,
}: SchoolPortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = useMemo(() => pageTitle(pathname ?? SCHOOL_HOME), [pathname]);

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
    <div className="min-h-screen bg-[var(--sand)] font-[family-name:var(--font-dm-sans)] text-[var(--text)] antialiased">
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
        id="school-sidebar"
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[240px] flex-col bg-[var(--green-dark)] py-5 transition-transform duration-[250ms] lg:translate-x-0 ${sidebarMobileClass}`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-[22px] pb-[22px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.12] text-sm font-bold text-white">
            U
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-bold leading-tight tracking-tight text-white">
              Univeera
            </span>
            <span className="text-[10.5px] font-medium uppercase leading-tight tracking-[0.06em] text-white/45">
              Counseling
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-3.5">
          {navSections.map((sec) => (
            <div key={sec.title} className={sec.className}>
              <div className="px-[22px] pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/40 first:pt-0">
                {sec.title}
              </div>
              <nav className="flex flex-col gap-px px-2.5">
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
                      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white ${
                        active
                          ? "sidebar-link-active bg-[rgba(82,183,135,0.15)] text-[var(--green-bright)]"
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

        <div className="mt-auto border-t border-white/[0.08] px-[18px] pt-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bright)] text-[13px] font-bold text-[var(--green-dark)]">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1 py-1">
              <div
                className="truncate text-[13px] font-semibold leading-tight text-white"
                title={displayName}
              >
                {displayName || "School admin"}
              </div>
              <div className="text-[11px] leading-tight text-white/50">
                {userRole}
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="flex cursor-pointer rounded-md bg-transparent p-1.5 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
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
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-[240px]">
        <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[var(--border-light)] bg-white px-4 py-3.5 lg:px-8">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              className="-ml-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-light)] bg-[#faf9f4] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] lg:hidden"
              onClick={openSidebar}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="school-sidebar"
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
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5 lg:pt-0">
              <div className="text-[11.5px] font-medium uppercase leading-tight tracking-[0.06em] text-[var(--text-hint)]">
                School Counseling
              </div>
              <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl leading-tight tracking-tight text-[var(--text)]">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <label className="relative hidden w-[300px] min-[761px]:block">
              <span className="sr-only">Search students</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-hint)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search students..."
                className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-2 pl-9 pr-3 font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
              />
            </label>
            <button
              type="button"
              title="Notifications"
              className="relative flex cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-[var(--border)] bg-[#faf9f4] p-2 text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
              aria-label="Notifications"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span
                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#E74C3C]"
                aria-hidden
              />
            </button>
            <div className="flex max-w-[200px] items-center gap-1.5 rounded-full bg-[var(--green-bg)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--green-dark)] min-[761px]:max-w-none">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[var(--green-dark)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              <span className="truncate">{schoolName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
