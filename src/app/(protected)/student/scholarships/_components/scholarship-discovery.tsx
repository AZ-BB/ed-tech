"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ScholarshipDiscoveryPageData } from "../_lib/get-scholarship-discovery-programs";
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
    n.set("page", "1");
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
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

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

  const hrefPage = useCallback(
    (p: number) =>
      mergeSearchHref(pathname, searchParams, { page: String(p) }, false),
    [pathname, searchParams],
  );

  const openDetail = (id: string) => {
    navigate({ detail: id }, false);
  };

  const closeDetail = () => {
    navigate({ detail: undefined }, false);
  };

  const visible = pageData.scholarships;

  const applyScholarship: Scholarship | null = useMemo(() => {
    const id = applySourceId ?? pageData.detailId;
    if (!id) return null;
    return visible.find((x) => x.id === id) ?? pageData.detailScholarship;
  }, [applySourceId, pageData.detailId, pageData.detailScholarship, visible]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const noResults = pageData.totalMatching === 0;

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

      {pageData.totalMatching > 0 ? (
        <ScholarshipCategorySection
          title="Scholarships"
          subtitle="Government, university, foundation, and corporate programs in one directory"
          iconWrapClass="bg-[#EEF2F7]"
          count={pageData.totalMatching}
          scholarships={pageData.scholarships}
          onSelect={openDetail}
          savedIds={savedIds}
          onToggleSave={toggleSave}
          footer={
            <ScholarshipPaginationNav
              hrefForPage={hrefPage}
              currentPage={pageData.page}
              totalPages={pageData.totalPages}
              totalItems={pageData.totalMatching}
              ariaLabel="Scholarships pages"
            />
          }
          icon={
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
          }
        />
      ) : null}

      <ScholarshipDetailPanel
        scholarship={pageData.detailScholarship}
        open={detailOpen}
        onClose={closeDetail}
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
