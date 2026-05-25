"use client";

import {
  activateAdminSchool,
  deactivateAdminSchool,
} from "@/actions/admin-schools";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import type { AdminSchoolDetailPayload } from "../_lib/fetch-admin-school-detail";
import type { AdminSchoolDetailTab } from "../_lib/parse-admin-school-detail-search-params";

const TAB_DEFS: { id: AdminSchoolDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "sessions", label: "Sessions" },
  { id: "logs", label: "Logs" },
];

export type AdminSchoolViewClientProps = {
  school: AdminSchoolDetailPayload["school"];
  tabCounts: AdminSchoolDetailPayload["tabCounts"];
  initialTab: AdminSchoolDetailTab;
  children: ReactNode;
};

export function AdminSchoolViewClient({
  school,
  tabCounts,
  initialTab,
  children,
}: AdminSchoolViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminSchoolDetailTab>(initialTab);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "overview") {
      if (!currentTab || currentTab === "overview") return;
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }

    if (currentTab === tab) return;
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [tab, pathname, router, searchParams]);

  const studentsLabel =
    school.studentsLimit != null
      ? `${school.studentCount}/${school.studentsLimit}`
      : String(school.studentCount);

  function tabBadgeCount(tabId: AdminSchoolDetailTab): number | null {
    if (tabId === "students") return tabCounts.students;
    if (tabId === "teachers") return tabCounts.teachers;
    return null;
  }

  function toggleSchoolActive() {
    const isActive = school.isActive;
    const confirmMessage = isActive
      ? `Deactivate ${school.name}? Students and teachers will not be able to log in.`
      : `Activate ${school.name}? Students and teachers will be able to log in again.`;

    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startTransition(async () => {
      const result = isActive
        ? await deactivateAdminSchool(school.id)
        : await activateAdminSchool(school.id);

      if (!result.ok) {
        setStatusError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const actionBtnClass =
    "mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

  return (
    <div className="w-full">
      <Link
        href="/admin/schools"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to all schools
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-xl font-bold text-[var(--green-dark)]">
              {school.code.slice(0, 2).toUpperCase()}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {school.name}
            </div>
            <div className="text-xs text-[var(--text-light)]">{school.locationLabel}</div>
            <code className="rounded-[4px] bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#2D6A4F]">
              {school.code}
            </code>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                school.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {school.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {[
            { lab: "Students", val: studentsLabel },
            { lab: "Teachers", val: String(school.teacherCount) },
            { lab: "Owner", val: school.ownerName },
            { lab: "Contact", val: school.contactEmail },
            { lab: "Renewal", val: school.renewalLabel },
            { lab: "Subscription", val: school.subscriptionStatus },
          ].map((row) => (
            <div key={row.lab} className="flex justify-between gap-2 py-1 text-[12.5px]">
              <span className="shrink-0 text-[var(--text-light)]">{row.lab}</span>
              <span className="max-w-[60%] break-words text-right font-medium text-[var(--text)]">
                {row.val}
              </span>
            </div>
          ))}

          {statusError ? (
            <p className="text-[11.5px] text-red-600" role="alert">
              {statusError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={toggleSchoolActive}
            className={`${actionBtnClass} ${
              school.isActive
                ? "border-[rgba(231,76,60,.35)] bg-white text-[#8c2d22] hover:bg-[rgba(231,76,60,.08)]"
                : "border-[var(--green)] bg-[var(--green)] text-white hover:opacity-90"
            }`}
          >
            {isPending
              ? school.isActive
                ? "Deactivating…"
                : "Activating…"
              : school.isActive
                ? "Deactivate"
                : "Activate"}
          </button>
        </aside>

        <div className="sd-main flex flex-col gap-[18px]">
          <div className="sd-tabs flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
            {TAB_DEFS.map((t) => {
              const active = tab === t.id;
              const badge = tabBadgeCount(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 cursor-pointer rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--green)] text-white"
                      : "text-[var(--text-mid)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                  }`}
                >
                  {t.label}
                  {badge != null ? (
                    <span
                      className={`ml-1.5 text-[10px] font-normal ${
                        active ? "text-white/80" : "text-[var(--text-hint)]"
                      }`}
                    >
                      ({badge})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
