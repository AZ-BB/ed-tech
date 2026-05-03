"use client";

import { logout } from "@/action/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  sidebarNavItems,
  type SidebarNavItem,
} from "../_data/student-dashboard-data";

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function isSidebarNavLinkActive(
  pathname: string,
  item: Extract<SidebarNavItem, { type: "link" }>,
): boolean {
  if (item.href === "#") return false;
  const n = normalizePath(pathname);
  const h = normalizePath(item.href);
  if (n === h) return true;
  if (item.id === "advisor-sessions" && h === "/student/advisor-sessions" && n.startsWith(`${h}/`)) {
    return true;
  }
  if (item.id === "ambassadors" && h === "/student/ambassadors" && n.startsWith(`${h}/`)) {
    return true;
  }
  return false;
}

/** `/student/universities/[id]` — list page is `/student/universities` only */
function isStudentUniversityDetailPath(pathname: string) {
  const normalized = normalizePath(pathname);
  const parts = normalized.split("/");
  return (
    parts.length === 4 &&
    parts[1] === "student" &&
    parts[2] === "universities" &&
    Boolean(parts[3])
  );
}

/** Full-page booking flow — hide shell header like university detail */
function isStudentAdvisorSessionBookPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return /\/student\/advisor-sessions\/[^/]+\/book$/.test(normalized);
}

function isStudentAmbassadorSessionBookPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return /\/student\/ambassadors\/[^/]+\/book$/.test(normalized);
}

function shellHeaderFromPathname(pathname: string): {
  label: string;
  iconPaths: string[];
} {
  for (const item of sidebarNavItems) {
    if (item.type === "divider") continue;
    if (item.href === "#") continue;
    if (item.type === "link" && isSidebarNavLinkActive(pathname, item)) {
      return { label: item.label, iconPaths: item.iconPaths };
    }
  }
  const dashboard = sidebarNavItems.find(
    (i): i is Extract<SidebarNavItem, { type: "link" }> =>
      i.type === "link" && i.id === "dashboard",
  );
  if (dashboard) {
    return { label: dashboard.label, iconPaths: dashboard.iconPaths };
  }
  return {
    label: "Dashboard",
    iconPaths: [
      "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
      "M9 22V12h6v10",
    ],
  };
}

function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3.5">
      {sidebarNavItems.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              className="mx-3.5 my-2.5 h-px bg-[var(--border-light)]"
            />
          );
        }

        const active = item.type === "link" ? isSidebarNavLinkActive(pathname, item) : false;
        const rowClass = `flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-medium transition-colors mb-0.5 cursor-pointer ${
          active
            ? "bg-[var(--green-bg)] font-semibold text-[var(--green-dark)] [&_svg]:stroke-[var(--green)]"
            : "text-[var(--text-mid)] hover:bg-[var(--sand)] hover:text-[var(--text)] [&_svg]:stroke-[var(--text-hint)]"
        }`;

        const inner = (
          <>
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {item.iconPaths.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </span>
            {item.label}
          </>
        );

        if (item.href === "#") {
          return (
            <a
              key={item.id}
              href="#"
              className="block text-inherit no-underline"
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.();
              }}
            >
              <div className={rowClass}>{inner}</div>
            </a>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            className="block text-inherit no-underline"
            onClick={() => onNavigate?.()}
          >
            <div className={rowClass}>{inner}</div>
          </Link>
        );
      })}
      <form action={logout} className="mt-1 px-3 pb-2">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-[13.5px] font-medium text-[var(--text-mid)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--text)] [&_svg]:stroke-[var(--text-hint)] hover:[&_svg]:stroke-[var(--text-mid)]"
        >
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center [&_svg]:h-[18px] [&_svg]:w-[18px]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </span>
          Log out
        </button>
      </form>
    </nav>
  );
}

function SidebarHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] pb-4 pt-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[15px] font-bold text-[var(--text)]">
          UniApply
        </span>
      </div>
      {onClose ? (
        <button
          type="button"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-light)] bg-white transition-colors hover:border-[var(--border)] hover:bg-[var(--sand)]"
          onClick={onClose}
          aria-label="Close menu"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7a7a7a"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function StudentLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  /** Collapsible drawer from the right + dimmed overlay — same pattern as dashboard.html */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const shellHeader = useMemo(
    () => shellHeaderFromPathname(pathname),
    [pathname],
  );

  const hideTopNav =
    isStudentUniversityDetailPath(pathname) ||
    isStudentAdvisorSessionBookPath(pathname) ||
    isStudentAmbassadorSessionBookPath(pathname);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="min-h-screen bg-[var(--sand)]">
      <div className="mx-auto w-full px-32 pt-6 pb-16">
        {hideTopNav ? null : (
          <header className="mb-5 flex items-center justify-between rounded-xl border border-[var(--border-light)] bg-white px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--green-bg)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {shellHeader.iconPaths.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              </div>
              <span className="text-base font-semibold text-[var(--text)]">
                {shellHeader.label}
              </span>
            </div>
            <button
              type="button"
              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-white transition-colors hover:bg-[var(--sand)]"
              onClick={openSidebar}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
              aria-controls="student-sidebar-panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7a7a7a"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M4 12h16M4 6h16M4 18h16" />
              </svg>
            </button>
          </header>
        )}

        {children}
      </div>

      <div
        role="presentation"
        className={`fixed inset-0 z-[900] bg-black/30 transition-opacity duration-[250ms] ${
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />

      <div
        id="student-sidebar-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 right-0 z-[910] flex w-[300px] max-w-full flex-col rounded-l-2xl bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] max-[480px]:w-full max-[480px]:rounded-none ${
          sidebarOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none translate-x-full"
        }`}
      >
        <SidebarHeader onClose={closeSidebar} />
        <SidebarNav onNavigate={closeSidebar} />
      </div>
    </div>
  );
}
