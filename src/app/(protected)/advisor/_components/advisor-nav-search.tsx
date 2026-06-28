"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;

const ADVISOR_APPLICATIONS = "/advisor/applications";
const SEARCH_STORAGE_KEY = "advisor-portal-search";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isAdvisorApplicationsPath(pathname: string) {
  const n = normalizePath(pathname);
  return n === ADVISOR_APPLICATIONS;
}

function readStoredSearch(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredSearch(value: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = value.trim();
    if (trimmed) sessionStorage.setItem(SEARCH_STORAGE_KEY, trimmed);
    else sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function AdvisorNavSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);
  const restoringRef = useRef(false);

  const onApplicationsPage = isAdvisorApplicationsPath(pathname ?? "");
  const urlSearch = onApplicationsPage ? (searchParams.get("search") ?? "") : "";
  const [value, setValue] = useState(urlSearch);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (onApplicationsPage) {
      setValue(urlSearch);
    }
  }, [urlSearch, onApplicationsPage, pathname]);

  /** Re-apply search after sidebar navigation drops query params on applications page. */
  useEffect(() => {
    if (!onApplicationsPage) return;
    if (urlSearch.trim()) {
      writeStoredSearch(urlSearch);
      return;
    }
    const stored = readStoredSearch().trim();
    if (!stored || restoringRef.current) return;

    restoringRef.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set("search", stored);
    params.set("applicationsPage", "1");
    const qs = params.toString();
    router.replace(`${normalizePath(pathname ?? "")}?${qs}`, { scroll: false });
    queueMicrotask(() => {
      restoringRef.current = false;
    });
  }, [pathname, urlSearch, router, searchParams, onApplicationsPage]);

  const applySearch = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      writeStoredSearch(trimmed);

      if (isAdvisorApplicationsPath(pathnameRef.current ?? "")) {
        const params = new URLSearchParams(searchParams.toString());
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
        params.set("applicationsPage", "1");
        const qs = params.toString();
        router.replace(
          qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current ?? "",
          { scroll: false },
        );
        return;
      }

      const params = new URLSearchParams();
      if (trimmed) {
        params.set("search", trimmed);
      }
      const qs = params.toString();
      router.push(qs ? `${ADVISOR_APPLICATIONS}?${qs}` : ADVISOR_APPLICATIONS);
    },
    [router, searchParams],
  );

  const scheduleApply = useCallback(
    (next: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => applySearch(next), 300);
    },
    [applySearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <label className="relative hidden w-[300px] min-[761px]:block">
      <span className="sr-only">Search students by name or email</span>
      <svg
        className="pointer-events-none absolute left-[12px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#a0a0a0]"
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
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          scheduleApply(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            applySearch(value);
          }
        }}
        placeholder="Search students by name or email…"
        className="w-full rounded-[8px] border-[1.5px] border-[#e0deda] bg-[#faf9f4] py-[9px] pr-3 pl-9 font-[inherit] text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] focus:bg-white"
        style={{ fontFamily: fontSans }}
      />
    </label>
  );
}
