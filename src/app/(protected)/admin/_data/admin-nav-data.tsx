import type { ReactNode } from "react";

export const ADMIN_HOME = "/admin";

type NavSvgProps = React.SVGProps<SVGSVGElement> & {
  paths: ReactNode;
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
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden
      {...rest}
    >
      {paths}
    </svg>
  );
}

export type AdminNavLink = {
  href: string;
  label: string;
  icon: ReactNode;
};

export type AdminNavSection = {
  title: string;
  links: readonly AdminNavLink[];
};

export const adminNavSections: readonly AdminNavSection[] = [
  {
    title: "Overview",
    links: [
      {
        href: ADMIN_HOME,
        label: "Dashboard",
        icon: (
          <NavSvg
            paths={
              <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    title: "Manage",
    links: [
      {
        href: `${ADMIN_HOME}/users`,
        label: "Users",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/schools`,
        label: "Schools",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/content`,
        label: "Content",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/sessions`,
        label: "Sessions",
        icon: (
          <NavSvg
            paths={
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/applications`,
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
        href: `${ADMIN_HOME}/post-admission`,
        label: "Post-admission",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/paid-applicants`,
        label: "Paid Applicant",
        icon: (
          <NavSvg
            paths={
              <>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
                <path d="M6 15h4" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/documents`,
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
    ],
  },
  {
    title: "Insights",
    links: [
      {
        href: `${ADMIN_HOME}/reports`,
        label: "Reports",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/activity-log`,
        label: "Activity Log",
        icon: (
          <NavSvg
            paths={
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    title: "System",
    links: [
      {
        href: `${ADMIN_HOME}/communications`,
        label: "Communications",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/contact-us`,
        label: "Contact Us",
        icon: (
          <NavSvg
            paths={
              <>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </>
            }
          />
        ),
      },
      {
        href: `${ADMIN_HOME}/settings`,
        label: "Settings",
        icon: (
          <NavSvg
            paths={
              <>
                <circle cx="12" cy="12" r="3" />
                <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              </>
            }
          />
        ),
      },
    ],
  },
];

export const ADMIN_PAGE_TITLE_BY_PATH: Record<string, string> = {
  [ADMIN_HOME]: "Dashboard",
  [`${ADMIN_HOME}/users`]: "User Management",
  [`${ADMIN_HOME}/schools`]: "Schools",
  [`${ADMIN_HOME}/content`]: "Content Management",
  [`${ADMIN_HOME}/sessions`]: "Sessions",
  [`${ADMIN_HOME}/applications`]: "Applications",
  [`${ADMIN_HOME}/post-admission`]: "Post-admission",
  [`${ADMIN_HOME}/paid-applicants`]: "Paid Applicant",
  [`${ADMIN_HOME}/documents`]: "Documents",
  [`${ADMIN_HOME}/reports`]: "Reports",
  [`${ADMIN_HOME}/activity-log`]: "Activity Log",
  [`${ADMIN_HOME}/communications`]: "Communications",
  [`${ADMIN_HOME}/contact-us`]: "Contact Us",
  [`${ADMIN_HOME}/settings`]: "Settings",
  [`${ADMIN_HOME}/universities/import`]: "Import Universities",
};
