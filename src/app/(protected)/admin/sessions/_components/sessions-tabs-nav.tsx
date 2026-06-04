"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SessionsTabCounts } from "../_data/sessions-tabs-data";
import {
  isAdminSessionsDetailChromeHidden,
  sessionsTabs,
} from "../_data/sessions-tabs-data";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function tabActive(pathname: string, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href);
}

export type SessionsTabsNavProps = {
  counts: SessionsTabCounts;
};

export function SessionsTabsNav({ counts }: SessionsTabsNavProps) {
  const pathname = usePathname() ?? "";

  if (isAdminSessionsDetailChromeHidden(pathname)) {
    return null;
  }

  return (
    <nav
      className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b-2 border-[#ece9e4] px-4 max-[760px]:-mx-4 max-[760px]:px-4 lg:-mx-8 lg:px-8"
      aria-label="Session types"
    >
      {sessionsTabs.map((tab) => {
        const active = tabActive(pathname, tab.href);
        const count = counts[tab.id];
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch={false}
            className={`mb-[-2px] flex shrink-0 items-center gap-1 border-b-2 px-4 py-2 text-[12px] font-semibold transition-all duration-150 ${
              active
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-[#a0a0a0] hover:text-[#4a4a4a]"
            }`}
          >
            {tab.label}
            <span className="ml-1 rounded-[8px] bg-[#E8F5EE] px-[6px] py-px text-[9px] font-bold leading-none text-[#2D6A4F]">
              {count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
