"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  addScholarshipToShortlist,
  removeScholarshipFromShortlist,
  saveScholarship,
  unsaveScholarship,
} from "@/actions/scholarship-activities";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import type {
  ScholarshipDiscoveryPageData,
  ScholarshipDiscoveryTab,
} from "../_lib/get-scholarship-discovery-programs";
import { governmentCountryAlpha2FromNationalityFilter } from "../_lib/government-scholarship-country-for-nationality";
import type { Scholarship } from "./types";
import { ScholarshipApplyModal } from "./scholarship-apply-modal";
import { ScholarshipCategorySection } from "./scholarship-category-section";
import { ScholarshipDetailPanel } from "./scholarship-detail-panel";
import { ScholarshipEmptyCatalog } from "./scholarship-empty-catalog";
import { ScholarshipPaginationNav } from "./scholarship-pagination-nav";
import { ScholarshipSelectorBar } from "./scholarship-selector-bar";

function mergeSearchHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
  resetPagingForFilter: boolean,
): string {
  const n = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") n.delete(k);
    else n.set(k, v);
  }
  if (resetPagingForFilter) {
    n.set("gPage", "1");
    n.set("oPage", "1");
    n.delete("page");
    n.delete("govPage");
    n.delete("intlPage");
  }
  const qs = n.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ScholarshipDiscovery({
  pageData,
}: {
  pageData: ScholarshipDiscoveryPageData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [applyOpen, setApplyOpen] = useState(false);
  const [applySourceId, setApplySourceId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState(
    () => new Set(pageData.savedDiscoveryIds),
  );
  const [shortlistIds, setShortlistIds] = useState(
    () => new Set(pageData.shortlistedDiscoveryIds),
  );

  useEffect(() => {
    setSavedIds(new Set(pageData.savedDiscoveryIds));
    setShortlistIds(new Set(pageData.shortlistedDiscoveryIds));
  }, [pageData.savedDiscoveryIds, pageData.shortlistedDiscoveryIds]);

  const { filters } = pageData;
  const detailOpen = pageData.detailScholarship !== null;

  const navigate = useCallback(
    (patch: Record<string, string | undefined>, resetPagingForFilter: boolean) => {
      router.replace(
        mergeSearchHref(pathname, searchParams, patch, resetPagingForFilter),
      );
    },
    [pathname, router, searchParams],
  );

  const onNationalityChange = (v: string) => {
    navigate({ nat: v === "any" ? undefined : v }, true);
  };
  const onDestinationChange = (v: string) => {
    navigate({ dest: v === "any" ? undefined : v }, true);
  };
  const onCoverageChange = (v: string) => {
    navigate({ cov: v === "any" ? undefined : v }, true);
  };
  const onSearchSubmit = (q: string) => {
    navigate({ q: q.trim() ? q.trim() : undefined }, true);
  };

  const hrefGovPage = useCallback(
    (p: number) =>
      mergeSearchHref(pathname, searchParams, { gPage: String(p) }, false),
    [pathname, searchParams],
  );
  const hrefOtherPage = useCallback(
    (p: number) =>
      mergeSearchHref(pathname, searchParams, { oPage: String(p) }, false),
    [pathname, searchParams],
  );

  const openDetail = (id: string) => {
    navigate({ detail: id }, false);
  };

  const closeDetail = () => {
    navigate({ detail: undefined }, false);
  };

  const activeTab: ScholarshipDiscoveryTab = pageData.tab;

  const visible = useMemo(
    () => [...pageData.government.scholarships, ...pageData.other.scholarships],
    [pageData.government.scholarships, pageData.other.scholarships],
  );

  const govCountryAlpha2 = governmentCountryAlpha2FromNationalityFilter(
    filters.nat === "any" ? "any" : filters.nat,
  );
  const governmentCountryLabel =
    govCountryAlpha2 != null ? getCountryNameByAlpha2(govCountryAlpha2) : null;

  const tabSlice =
    activeTab === "government" ? pageData.government : pageData.other;

  const setTab = (t: ScholarshipDiscoveryTab) => {
    navigate(
      {
        tab: t === "other" ? "other" : undefined,
      },
      false,
    );
  };

  const applyScholarship: Scholarship | null = useMemo(() => {
    const id = applySourceId ?? pageData.detailId;
    if (!id) return null;
    return visible.find((x) => x.id === id) ?? pageData.detailScholarship;
  }, [applySourceId, pageData.detailId, pageData.detailScholarship, visible]);

  const toggleSave = async (id: string) => {
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    const res = wasSaved ? await unsaveScholarship(id) : await saveScholarship(id);
    if (res.ok) {
      router.refresh();
      return;
    }
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.add(id);
      else next.delete(id);
      return next;
    });
    console.error(
      typeof res.error === "string" ? res.error : "Scholarship action failed",
    );
  };

  const detailScholarship = pageData.detailScholarship;

  const handleDetailSave = async () => {
    if (!detailScholarship) return;
    const id = detailScholarship.id;
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    const res = wasSaved ? await unsaveScholarship(id) : await saveScholarship(id);
    if (res.ok) {
      router.refresh();
      return;
    }
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.add(id);
      else next.delete(id);
      return next;
    });
    console.error(
      typeof res.error === "string" ? res.error : "Scholarship action failed",
    );
  };

  const handleDetailShortlist = async () => {
    if (!detailScholarship) return;
    const id = detailScholarship.id;
    const wasShortlisted = shortlistIds.has(id);
    setShortlistIds((prev) => {
      const next = new Set(prev);
      if (wasShortlisted) next.delete(id);
      else next.add(id);
      return next;
    });
    const res = wasShortlisted
      ? await removeScholarshipFromShortlist(id)
      : await addScholarshipToShortlist(id);
    if (res.ok) {
      router.refresh();
      return;
    }
    setShortlistIds((prev) => {
      const next = new Set(prev);
      if (wasShortlisted) next.add(id);
      else next.delete(id);
      return next;
    });
    console.error(
      typeof res.error === "string" ? res.error : "Scholarship action failed",
    );
  };

  const totalMatches =
    pageData.government.totalMatching + pageData.other.totalMatching;
  const noResults = totalMatches === 0;

  if (pageData.totalCatalog === 0) {
    return (
      <div className="mx-auto w-full px-2 pb-16 pt-0">
        <header className="mb-8">
          <h1 className="serif mb-1 text-[26px] font-bold text-[var(--text)]">
            Find your scholarship
          </h1>
          <p className="text-[14px] text-[var(--text-light)]">
            Scholarships matched to your nationality, destination, and goals
          </p>
        </header>
        <ScholarshipEmptyCatalog />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-2 pb-16 pt-0">
      <header className="mb-6">
        <h1 className="serif mb-1 text-[26px] font-bold text-[var(--text)]">
          Find your scholarship
        </h1>
        <p className="text-[14px] text-[var(--text-light)]">
          Scholarships matched to your nationality, destination, and goals
        </p>
      </header>

      <ScholarshipSelectorBar
        q={filters.q}
        nationality={filters.nat}
        destination={filters.dest}
        coverage={filters.cov}
        onNationalityChange={onNationalityChange}
        onDestinationChange={onDestinationChange}
        onCoverageChange={onCoverageChange}
        onSearchSubmit={onSearchSubmit}
      />

      {noResults ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-light)]">
          No scholarships match your current filters or search.
        </p>
      ) : null}

      {totalMatches > 0 ? (
        <>
          <p className="mb-3 text-[12px] text-[var(--text-hint)]">
            {totalMatches} scholarship{totalMatches === 1 ? "" : "s"} match your
            filters · Government: {pageData.government.totalMatching} · Other:{" "}
            {pageData.other.totalMatching}
          </p>

          <div
            className="mb-4 flex gap-1 rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-[#faf9f7] p-1"
            role="tablist"
            aria-label="Scholarship type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "government"}
              className={`min-w-0 flex-1 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                activeTab === "government"
                  ? "bg-white text-[var(--text)] shadow-sm"
                  : "text-[var(--text-mid)] hover:text-[var(--text)]"
              }`}
              onClick={() => setTab("government")}
            >
              Government
              <span className="ml-1 text-[11px] font-normal text-[var(--text-hint)]">
                ({pageData.government.totalMatching})
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "other"}
              className={`min-w-0 flex-1 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                activeTab === "other"
                  ? "bg-white text-[var(--text)] shadow-sm"
                  : "text-[var(--text-mid)] hover:text-[var(--text)]"
              }`}
              onClick={() => setTab("other")}
            >
              Other
              <span className="ml-1 text-[11px] font-normal text-[var(--text-hint)]">
                ({pageData.other.totalMatching})
              </span>
            </button>
          </div>

          {tabSlice.totalMatching === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-light)]">
              {activeTab === "government"
                ? "No government programs match your current filters or search."
                : "No other programs match your current filters or search."}
            </p>
          ) : (
            <ScholarshipCategorySection
              title={
                activeTab === "government"
                  ? "Government scholarships"
                  : "Other scholarships"
              }
              subtitle={
                activeTab === "government"
                  ? governmentCountryLabel
                    ? `Programs where ${governmentCountryLabel} is the sponsoring government`
                    : "National and ministry-funded programs"
                  : govCountryAlpha2
                    ? "University, foundation, corporate, and government programs from other countries"
                    : "University, foundation, corporate, and other programs"
              }
              iconWrapClass={
                activeTab === "government" ? "bg-[#E8EEF5]" : "bg-[#F0EDE8]"
              }
              scholarships={tabSlice.scholarships}
              onSelect={openDetail}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              footer={
                <ScholarshipPaginationNav
                  hrefForPage={
                    activeTab === "government" ? hrefGovPage : hrefOtherPage
                  }
                  currentPage={tabSlice.page}
                  totalPages={tabSlice.totalPages}
                  totalItems={tabSlice.totalMatching}
                  ariaLabel={
                    activeTab === "government"
                      ? "Government scholarships pages"
                      : "Other scholarships pages"
                  }
                />
              }
              icon={
                activeTab === "government" ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3d5a80"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M12 3L2 8l10 5 10-5-10-5z" />
                    <path d="M2 13l10 5 10-5M2 18l10 5 10-5" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b5b4f"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M12 3L2 8l10 5 10-5-10-5z" />
                    <path d="M2 13l10 5 10-5M2 18l10 5 10-5" />
                  </svg>
                )
              }
            />
          )}
        </>
      ) : null}

      <ScholarshipDetailPanel
        scholarship={pageData.detailScholarship}
        open={detailOpen}
        onClose={closeDetail}
        isSaved={detailScholarship ? savedIds.has(detailScholarship.id) : false}
        isShortlisted={detailScholarship ? shortlistIds.has(detailScholarship.id) : false}
        onSaveScholarship={handleDetailSave}
        onShortlistScholarship={handleDetailShortlist}
        onApplyNow={() => {
          if (pageData.detailId) setApplySourceId(pageData.detailId);
          setApplyOpen(true);
        }}
      />

      <ScholarshipApplyModal
        scholarship={applyScholarship}
        open={applyOpen}
        onClose={() => {
          setApplyOpen(false);
          setApplySourceId(null);
        }}
      />
    </div>
  );
}
