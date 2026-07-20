"use client";

import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { getDirection, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import { StudentLanguageSwitcher } from "@/lib/i18n/student-language-switcher";
import {
  Brain,
  ClipboardList,
  Compass,
  LayoutDashboard,
  LogOut,
  Package,
  ScanSearch,
  Briefcase,
  Send,
  Settings,
  Star,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  sidebarNavItems,
  type SidebarNavItem,
} from "../_data/student-dashboard-data";
import {
  NAV_ID_TO_FEATURE,
  defaultStudentFeatureAccess,
  isStudentFeatureEnabled,
  type StudentFeatureAccess,
} from "@/lib/student-feature-access";
import { StudentFeatureRouteGuard } from "./student-feature-route-guard";

const NAV_ID_TO_KEY: Record<string, keyof Dictionary["student"]["nav"]> = {
  dashboard: "dashboard",
  "my-applications": "myApplications",
  "personality-check": "personalityOverview",
  "program-discovery": "programDiscovery",
  "university-search": "universitySearch",
  scholarships: "scholarships",
  internships: "internships",
  "advisor-sessions": "advisorSessions",
  ambassadors: "ambassadors",
  "application-support": "applicationSupport",
  "post-admission-support": "postAdmission",
  webinars: "webinars",
  "account-settings": "accountSettings",
};

function navLabel(dict: Dictionary, navId: string): string {
  const key = NAV_ID_TO_KEY[navId];
  return key ? dict.student.nav[key] : dict.student.shell.dashboard;
}

const NAV_ICON_STROKE = 1.75;

function StudentNavIcon({
  navId,
  className,
}: {
  navId: string;
  className?: string;
}) {
  const common = {
    className,
    strokeWidth: NAV_ICON_STROKE,
    "aria-hidden": true as const,
  };
  switch (navId) {
    case "dashboard":
      return <LayoutDashboard {...common} />;
    case "my-applications":
      return <ClipboardList {...common} />;
    case "personality-check":
      return <Brain {...common} />;
    case "program-discovery":
      return <Compass {...common} />;
    case "university-search":
      return <ScanSearch {...common} />;
    case "scholarships":
      return <Star {...common} />;
    case "internships":
      return <Briefcase {...common} />;
    case "advisor-sessions":
      return <UserRound {...common} />;
    case "ambassadors":
      return <UsersRound {...common} />;
    case "application-support":
      return <Send {...common} />;
    case "post-admission-support":
      return <Package {...common} />;
    case "webinars":
      return <Video {...common} />;
    case "account-settings":
      return <Settings {...common} />;
    default:
      return <LayoutDashboard {...common} />;
  }
}

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
  if (item.id === "program-discovery") {
    return (
      n === "/student/programs" || n.startsWith("/student/programs/")
    );
  }
  if (item.id === "university-search") {
    return (
      n === "/student/universities" || n.startsWith("/student/universities/")
    );
  }
  if (n === h) return true;
  if (item.id === "advisor-sessions" && h === "/student/advisor-sessions" && n.startsWith(`${h}/`)) {
    return true;
  }
  if (item.id === "ambassadors" && h === "/student/ambassadors" && n.startsWith(`${h}/`)) {
    return true;
  }
  if (item.id === "webinars" && h === "/student/webinars" && n.startsWith(`${h}/`)) {
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

/** Catalog list only — booking subroutes hide the shell header. */
function isStudentAmbassadorsCatalogPath(pathname: string) {
  return normalizePath(pathname) === "/student/ambassadors";
}

function isStudentWebinarsPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return normalized === "/student/webinars" || normalized.startsWith("/student/webinars/");
}

function isStudentInternshipsPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return (
    normalized === "/student/internships" ||
    normalized.startsWith("/student/internships/")
  );
}

function isStudentApplicationSupportPath(pathname: string) {
  return normalizePath(pathname) === "/student/application-support";
}

function isStudentProgramsPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return (
    normalized === "/student/programs" ||
    normalized.startsWith("/student/programs/")
  );
}

function isStudentProgramFitTestPath(pathname: string) {
  return normalizePath(pathname) === "/student/program-fit-test";
}

function isStudentDiscoveryJourneyPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return (
    normalized === "/student/discovery-journey" ||
    normalized.startsWith("/student/discovery-journey/")
  );
}

function shellHeaderWidthClass(pathname: string): string {
  if (isStudentProgramsPath(pathname)) {
    return "mx-auto w-full max-w-[1180px]";
  }
  if (isStudentAmbassadorsCatalogPath(pathname)) {
    return "mx-auto w-full max-w-7xl";
  }
  if (isStudentWebinarsPath(pathname)) {
    return "mx-auto w-full max-w-[1180px]";
  }
  if (isStudentInternshipsPath(pathname)) {
    return "mx-auto w-full max-w-[1100px]";
  }
  if (isStudentDiscoveryJourneyPath(pathname)) {
    return "mx-auto w-full max-w-[1100px]";
  }
  return "";
}

function shellHeaderFromPathname(
  pathname: string,
  dict: Dictionary,
  navItems: SidebarNavItem[] = sidebarNavItems,
): {
  label: string;
  navId: string;
} {
  for (const item of navItems) {
    if (item.type === "divider") continue;
    if (item.href === "#") continue;
    if (item.type === "link" && isSidebarNavLinkActive(pathname, item)) {
      return { label: navLabel(dict, item.id), navId: item.id };
    }
  }
  return { label: dict.student.shell.dashboard, navId: "dashboard" };
}

function SidebarNav({
  dict,
  navItems,
  featureAccess,
  onNavigate,
  onRequestLogout,
}: {
  dict: Dictionary;
  navItems: SidebarNavItem[];
  featureAccess: StudentFeatureAccess;
  onNavigate?: () => void;
  onRequestLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3.5">
      {navItems.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              className="mx-3.5 my-2.5 h-px bg-[var(--border-light)]"
            />
          );
        }

        const featureKey = NAV_ID_TO_FEATURE[item.id];
        const featureDisabled =
          featureKey != null && !isStudentFeatureEnabled(featureAccess, featureKey);
        const active =
          !featureDisabled && isSidebarNavLinkActive(pathname, item);
        const rowClass = `group flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-medium transition-colors mb-0.5 ${
          featureDisabled
            ? "cursor-not-allowed opacity-45 text-[var(--text-hint)]"
            : active
              ? "cursor-pointer bg-[var(--green-bg)] font-semibold text-[var(--green-dark)]"
              : "cursor-pointer text-[var(--text-mid)] hover:bg-[var(--sand)] hover:text-[var(--text)]"
        }`;

        const inner = (
          <>
            <StudentNavIcon
              navId={item.id}
              className={
                featureDisabled
                  ? "h-[18px] w-[18px] shrink-0 text-[var(--text-hint)]"
                  : active
                    ? "h-[18px] w-[18px] shrink-0 text-[var(--green)]"
                    : "h-[18px] w-[18px] shrink-0 text-[var(--text-hint)] transition-colors group-hover:text-[var(--text-mid)]"
              }
            />
            {navLabel(dict, item.id)}
          </>
        );

        if (featureDisabled || item.href === "#") {
          return (
            <div
              key={item.id}
              className={rowClass}
              aria-disabled="true"
              title="This feature is not available on your account"
            >
              {inner}
            </div>
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
      <div className="mt-1 pb-2">
        <button
          type="button"
          className="group mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-start text-[13.5px] font-medium text-[var(--text-mid)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--text)]"
          onClick={onRequestLogout}
        >
          <LogOut
            className="h-[18px] w-[18px] shrink-0 text-[var(--text-hint)] transition-colors group-hover:text-[var(--text-mid)]"
            strokeWidth={NAV_ICON_STROKE}
            aria-hidden
          />
          {dict.student.shell.logOut}
        </button>
      </div>
    </nav>
  );
}

function SidebarHeader({
  dict,
  onClose,
}: {
  dict: Dictionary;
  onClose?: () => void;
}) {
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
          {dict.common.brand}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <StudentLanguageSwitcher />
        {onClose ? (
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-light)] bg-white transition-colors hover:border-[var(--border)] hover:bg-[var(--sand)]"
            onClick={onClose}
            aria-label={dict.student.shell.closeMenu}
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
    </div>
  );
}

export function StudentLayoutShell({
  children,
  locale,
  hasSchoolLinked = true,
  featureAccess = defaultStudentFeatureAccess(true),
}: {
  children: React.ReactNode;
  locale: Locale;
  /** When false, My Applications nav is hidden (independent students). */
  hasSchoolLinked?: boolean;
  featureAccess?: StudentFeatureAccess;
}) {
  /** Collapsible drawer from the right + dimmed overlay — same pattern as dashboard.html */
  const { dict } = useLocale();
  const portalDir = getDirection(locale);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const pathname = usePathname();
  const visibleNavItems = useMemo(
    () =>
      hasSchoolLinked
        ? sidebarNavItems
        : sidebarNavItems.filter(
            (item) => item.type === "divider" || item.id !== "my-applications",
          ),
    [hasSchoolLinked],
  );
  const shellHeader = useMemo(
    () => shellHeaderFromPathname(pathname, dict, visibleNavItems),
    [pathname, dict, visibleNavItems],
  );

  const hideTopNav =
    isStudentUniversityDetailPath(pathname) ||
    isStudentAdvisorSessionBookPath(pathname) ||
    isStudentAmbassadorSessionBookPath(pathname) ||
    isStudentProgramFitTestPath(pathname) ||
    isStudentDiscoveryJourneyPath(pathname);
  const headerWidthClass = shellHeaderWidthClass(pathname);
  const useGreenPageBackground = isStudentApplicationSupportPath(pathname);
  const isDiscoveryJourney = isStudentDiscoveryJourneyPath(pathname);
  const contentPaddingClass = isDiscoveryJourney
    ? "px-4 sm:px-6"
    : "px-4 sm:px-6 md:px-10 lg:px-16";

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

  useEffect(() => {
    const openFromDiscovery = () => setSidebarOpen(true);
    window.addEventListener("student-open-sidebar", openFromDiscovery);
    return () => window.removeEventListener("student-open-sidebar", openFromDiscovery);
  }, []);

  return (
    <div
      className={`student-portal min-h-screen ${useGreenPageBackground ? "bg-[var(--green-pale)]" : "bg-[var(--sand)]"}`}
      dir={portalDir}
      lang={locale}
    >
      <StudentFeatureRouteGuard featureAccess={featureAccess} />
      <div className={`mx-auto w-full min-w-0 ${contentPaddingClass} pt-4 sm:pt-6 pb-12 sm:pb-16`}>
        {hideTopNav ? null : (
          <header
            className={`relative z-10 mb-4 sm:mb-5 flex items-center justify-between rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 sm:px-5 sm:py-3.5${
              headerWidthClass ? ` ${headerWidthClass}` : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--green-bg)]">
                <StudentNavIcon
                  navId={shellHeader.navId}
                  className="h-[18px] w-[18px] text-[#2D6A4F]"
                />
              </div>
              <span className="text-base font-semibold text-[var(--text)]">
                {shellHeader.label}
              </span>
            </div>
            <button
              type="button"
              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-white transition-colors hover:bg-[var(--sand)]"
              onClick={openSidebar}
              aria-label={dict.student.shell.openMenu}
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
        aria-label={dict.student.shell.navigation}
        dir={portalDir}
        className={`fixed inset-y-0 right-0 z-[910] flex w-[300px] max-w-full flex-col rounded-l-2xl bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] max-[480px]:w-full max-[480px]:rounded-none ${
          sidebarOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none translate-x-full"
        }`}
      >
        <SidebarHeader dict={dict} onClose={closeSidebar} />
        <SidebarNav
          dict={dict}
          navItems={visibleNavItems}
          featureAccess={featureAccess}
          onNavigate={closeSidebar}
          onRequestLogout={() => {
            setLogoutConfirmOpen(true);
            closeSidebar();
          }}
        />
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        variant="student"
      />
    </div>
  );
}
