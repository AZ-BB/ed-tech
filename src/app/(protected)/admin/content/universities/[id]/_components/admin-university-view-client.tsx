"use client";

import { deleteAdminUniversity, setAdminUniversityActive } from "@/actions/admin-universities";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import type { AdminUniversityDetailPayload } from "../_lib/fetch-admin-university-detail";
import type { AdminUniversityDetailTab } from "../_lib/parse-admin-university-detail-search-params";

const TAB_DEFS: { id: AdminUniversityDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "favorites", label: "Favorites" },
];

export type AdminUniversityViewClientProps = {
  university: AdminUniversityDetailPayload["university"];
  tabCounts: AdminUniversityDetailPayload["tabCounts"];
  initialTab: AdminUniversityDetailTab;
  children: ReactNode;
};

export function AdminUniversityViewClient({
  university,
  tabCounts,
  initialTab,
  children,
}: AdminUniversityViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminUniversityDetailTab>(initialTab);
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

  function tabBadgeCount(tabId: AdminUniversityDetailTab): number | null {
    if (tabId === "shortlisted") return tabCounts.shortlisted;
    if (tabId === "favorites") return tabCounts.favorites;
    return null;
  }

  function toggleUniversityActive() {
    const isActive = university.isActive;
    const confirmMessage = isActive
      ? `Deactivate ${university.name}? Students will no longer see it in search.`
      : `Activate ${university.name}? It will appear in the student catalog again.`;

    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startStatusTransition(async () => {
      const result = await setAdminUniversityActive(university.id, !isActive);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteUniversity() {
    const confirmMessage = `Delete "${university.name}" permanently?\n\nThis removes the university from the catalog, its programs, and related student shortlist/favorite links. This cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startDeleteTransition(async () => {
      const result = await deleteAdminUniversity(university.id);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      router.push("/admin/content");
    });
  }

  const isActionPending = isStatusPending || isDeletePending;

  const initials = university.name
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
        href="/admin/content"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to universities
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            {university.logoUrl ? (
              <img
                src={university.logoUrl}
                alt=""
                className="h-[72px] w-[72px] rounded-full border border-[var(--border-light)] object-contain p-1"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-xl font-bold text-[var(--green-dark)]">
                {initials || "UN"}
              </div>
            )}
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {university.name}
            </div>
            <div className="text-xs text-[var(--text-light)]">{university.locationLabel}</div>
            <span className="text-[11px] font-medium text-[var(--text-mid)]">
              {university.typeLabel}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                university.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {university.isActive ? "Active" : "Inactive"}
            </span>
            {university.isPriority ? (
              <span className="inline-flex rounded-full bg-[#E3F2FD] px-2.5 py-0.5 text-[10px] font-semibold text-[#3498DB]">
                Priority
              </span>
            ) : null}
          </div>

          {[
            { lab: "Shortlisted", val: tabCounts.shortlisted.toLocaleString() },
            { lab: "Favorites", val: tabCounts.favorites.toLocaleString() },
            { lab: "Tuition", val: university.tuitionLabel },
            { lab: "Country", val: university.countryName },
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

          <div className="mt-2 flex flex-col space-y-2">
            <button
              type="button"
              disabled={isActionPending}
              onClick={toggleUniversityActive}
              className={`${actionBtnClass} ${
                university.isActive
                  ? "border-[rgba(231,76,60,.35)] bg-white text-[#8c2d22] hover:bg-[rgba(231,76,60,.08)]"
                  : "border-[var(--green)] bg-[var(--green)] text-white hover:opacity-90"
              }`}
            >
              {isStatusPending
                ? university.isActive
                  ? "Deactivating…"
                  : "Activating…"
                : university.isActive
                  ? "Deactivate"
                  : "Activate"}
            </button>

            <button
              type="button"
              disabled={isActionPending}
              onClick={handleDeleteUniversity}
              className={`${actionBtnClass} border-[rgba(231,76,60,.5)] bg-[rgba(231,76,60,.08)] text-[#8c2d22] hover:bg-[rgba(231,76,60,.15)]`}
            >
              {isDeletePending ? "Deleting…" : "Delete university"}
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
