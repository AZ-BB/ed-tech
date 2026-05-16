"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const fontSans =
  '"DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' as const;

export const SCHOOL_SEARCHABLE_PATHS = [
  "/school/students",
  "/school/applications",
  "/school/tasks",
  "/school/documents",
] as const;

const SEARCHABLE_PATHS = new Set<string>(SCHOOL_SEARCHABLE_PATHS);

const STUDENT_Q_STORAGE_KEY = "school-portal-studentQ";

function readStoredStudentQ(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STUDENT_Q_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredStudentQ(value: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = value.trim();
    if (trimmed) sessionStorage.setItem(STUDENT_Q_STORAGE_KEY, trimmed);
    else sessionStorage.removeItem(STUDENT_Q_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isSearchablePath(pathname: string) {
  return SEARCHABLE_PATHS.has(normalizePath(pathname));
}

/** Carry navbar student filter when navigating between list pages via the sidebar. */
export function buildNavHrefWithStudentQ(href: string, studentQ: string): string {
  const path = normalizePath(href);
  const trimmed = studentQ.trim();
  if (!trimmed || !SEARCHABLE_PATHS.has(path)) return href;
  const params = new URLSearchParams();
  params.set("studentQ", trimmed);
  params.set("page", "1");
  return `${path}?${params.toString()}`;
}

export function SchoolNavSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);
  const restoringRef = useRef(false);

  const urlStudentQ = searchParams.get("studentQ") ?? "";
  const [value, setValue] = useState(urlStudentQ);
  const searchable = isSearchablePath(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setValue(urlStudentQ);
  }, [urlStudentQ, pathname]);

  /** Re-apply navbar student filter after sidebar navigation drops query params. */
  useEffect(() => {
    if (!isSearchablePath(pathname)) return;
    if (urlStudentQ.trim()) {
      writeStoredStudentQ(urlStudentQ);
      return;
    }
    const stored = readStoredStudentQ().trim();
    if (!stored || restoringRef.current) return;

    restoringRef.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentQ", stored);
    params.set("page", "1");
    const qs = params.toString();
    router.replace(`${normalizePath(pathname)}?${qs}`, { scroll: false });
    queueMicrotask(() => {
      restoringRef.current = false;
    });
  }, [pathname, urlStudentQ, router, searchParams]);

  const applySearch = useCallback(
    (next: string) => {
      if (!isSearchablePath(pathnameRef.current)) return;

      const params = new URLSearchParams(searchParams.toString());
      const trimmed = next.trim();
      writeStoredStudentQ(trimmed);
      if (trimmed) {
        params.set("studentQ", trimmed);
      } else {
        params.delete("studentQ");
      }
      params.set("page", "1");

      const qs = params.toString();
      router.replace(
        qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current,
        { scroll: false },
      );
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

  if (!searchable) {
    return null;
  }

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
