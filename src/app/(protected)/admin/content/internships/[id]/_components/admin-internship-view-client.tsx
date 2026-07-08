"use client";

import {
  deleteAdminInternship,
  setAdminInternshipActive,
} from "@/actions/admin-internships";
import { ADMIN_INTERNSHIPS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import type { AdminInternshipDetailPayload } from "../_lib/fetch-admin-internship-detail";
import type { AdminInternshipDetailTab } from "../_lib/parse-admin-internship-detail-search-params";

const TAB_DEFS: { id: AdminInternshipDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "saved", label: "Saved" },
];

export type AdminInternshipViewClientProps = {
  internship: AdminInternshipDetailPayload["internship"];
  tabCounts: AdminInternshipDetailPayload["tabCounts"];
  initialTab: AdminInternshipDetailTab;
  children: ReactNode;
};

export function AdminInternshipViewClient({
  internship,
  tabCounts,
  initialTab,
  children,
}: AdminInternshipViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminInternshipDetailTab>(initialTab);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "overview") {
      if (!currentTab || currentTab === "overview") return;
      next.delete("tab");
      next.delete("studentsPage");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }

    if (currentTab === tab) return;
    next.set("tab", tab);
    next.set("studentsPage", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [tab, pathname, router, searchParams]);

  function tabBadgeCount(tabId: AdminInternshipDetailTab): number | null {
    if (tabId === "saved") return tabCounts.saved;
    return null;
  }

  function toggleInternshipActive() {
    const isActive = internship.isActive;
    const confirmMessage = isActive
      ? `Deactivate ${internship.name}? Students will no longer see it in discovery.`
      : `Activate ${internship.name}? It will appear in the student catalog again.`;

    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startStatusTransition(async () => {
      const result = await setAdminInternshipActive(internship.id, !isActive);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteInternship() {
    const confirmMessage = `Delete "${internship.name}" permanently?\n\nThis removes the internship and related student save links. This cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startDeleteTransition(async () => {
      const result = await deleteAdminInternship(internship.id);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.push(ADMIN_INTERNSHIPS_HOME);
    });
  }

  const isActionPending = isStatusPending || isDeletePending;

  const initials = internship.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const actionBtnClass =
    "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

  return (
    <div className="w-full">
      <Link
        href={ADMIN_INTERNSHIPS_HOME}
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to internships
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-xl font-bold text-[var(--green-dark)]">
              {initials || "IN"}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {internship.name}
            </div>
            <div className="text-xs text-[var(--text-light)]">
              {internship.provider}
            </div>
            <span className="text-[11px] font-medium text-[var(--text-mid)]">
              {internship.sectionLabel}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                internship.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {internship.isActive ? "Active" : "Inactive"}
            </span>
            {internship.needsReview ? (
              <span className="inline-flex rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
                Needs review
              </span>
            ) : null}
          </div>

          {[
            { lab: "Saved", val: tabCounts.saved.toLocaleString() },
            { lab: "Country", val: internship.countryLabel },
            { lab: "Location", val: internship.locationLabel },
            { lab: "Format", val: internship.formatLabel },
            { lab: "Pay", val: internship.payLabel },
          ].map((row) => (
            <div
              key={row.lab}
              className="flex justify-between gap-2 py-1 text-[12.5px]"
            >
              <span className="shrink-0 text-[var(--text-light)]">
                {row.lab}
              </span>
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

          <div className="mt-2 flex flex-col space-y-2">
            <button
              type="button"
              disabled={isActionPending}
              onClick={toggleInternshipActive}
              className={`${actionBtnClass} ${
                internship.isActive
                  ? "border-[rgba(231,76,60,.35)] bg-white text-[#8c2d22] hover:bg-[rgba(231,76,60,.08)]"
                  : "border-[var(--green)] bg-[var(--green)] text-white hover:opacity-90"
              }`}
            >
              {isStatusPending
                ? internship.isActive
                  ? "Deactivating…"
                  : "Activating…"
                : internship.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>

            <button
              type="button"
              disabled={isActionPending}
              onClick={handleDeleteInternship}
              className={`${actionBtnClass} border-[rgba(231,76,60,.5)] bg-[rgba(231,76,60,.08)] text-[#8c2d22] hover:bg-[rgba(231,76,60,.15)]`}
            >
              {isDeletePending ? "Deleting…" : "Delete internship"}
            </button>
          </div>
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
