"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import {
  isSchoolViewNavPath,
  parseSchoolPortalView,
  SCHOOL_VIEW_ALL,
  SCHOOL_VIEW_MY,
  type SchoolPortalView,
  writeStoredSchoolPortalView,
} from "@/lib/school-portal-view";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function SchoolPortalViewToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlView = parseSchoolPortalView(searchParams.get("view") ?? undefined);
  const onViewablePage = isSchoolViewNavPath(pathname ?? "/school");

  /** Keep session storage aligned with the URL (source of truth). */
  useEffect(() => {
    if (!onViewablePage) return;
    writeStoredSchoolPortalView(urlView);
  }, [onViewablePage, urlView]);

  const setView = useCallback(
    (next: SchoolPortalView) => {
      writeStoredSchoolPortalView(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === SCHOOL_VIEW_MY) {
        params.set("view", SCHOOL_VIEW_MY);
      } else {
        params.delete("view");
      }
      params.set("page", "1");
      const qs = params.toString();
      router.replace(
        qs
          ? `${normalizePath(pathname ?? "/school")}?${qs}`
          : normalizePath(pathname ?? "/school"),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  if (!onViewablePage) {
    return null;
  }

  return (
    <div
      className="hidden items-center rounded-[8px] border-[1.5px] border-[#e0deda] bg-[#faf9f4] p-[3px] min-[900px]:flex"
      role="group"
      aria-label="Portal view"
      style={{ fontFamily: fontSans }}
    >
      <button
        type="button"
        onClick={() => setView(SCHOOL_VIEW_ALL)}
        aria-pressed={urlView === SCHOOL_VIEW_ALL}
        className={`cursor-pointer rounded-[6px] px-[10px] py-[6px] text-[12px] font-semibold transition-colors ${
          urlView === SCHOOL_VIEW_ALL
            ? "bg-white text-[#1B4332] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            : "bg-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"
        }`}
      >
        All View
      </button>
      <button
        type="button"
        onClick={() => setView(SCHOOL_VIEW_MY)}
        aria-pressed={urlView === SCHOOL_VIEW_MY}
        className={`cursor-pointer rounded-[6px] px-[10px] py-[6px] text-[12px] font-semibold transition-colors ${
          urlView === SCHOOL_VIEW_MY
            ? "bg-white text-[#1B4332] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            : "bg-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"
        }`}
      >
        My View
      </button>
    </div>
  );
}
