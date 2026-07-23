"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  saveInternship,
  unsaveInternship,
} from "@/actions/internship-activities";
import { useStudentFeatureGate } from "@/app/(protected)/student/_components/student-feature-gate-provider";
import { useLocale } from "@/lib/i18n/locale-context";
import type { InternshipDiscoveryPageData } from "../_lib/get-internship-discovery-programs";
import type {
  InternshipLocFilter,
  InternshipPayFilter,
} from "../_lib/parse-internship-discovery-search-params";
import type { InternshipSection } from "./types";
import { InternshipCategorySection } from "./internship-category-section";
import { InternshipDetailOverlay } from "./internship-detail-overlay";
import { InternshipEmptyCatalog } from "./internship-empty-catalog";
import { InternshipPaginationNav } from "./internship-pagination-nav";
import { InternshipRequestCta } from "./internship-request-cta";
import { InternshipRequestModal } from "./internship-request-modal";
import { InternshipSelectorBar } from "./internship-selector-bar";

function mergeSearchHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
): string {
  const n = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") n.delete(k);
    else n.set(k, v);
  }
  const qs = n.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const SECTION_META: Record<
  InternshipSection,
  {
    color: string;
    stroke: string;
    icon: ReactNode;
  }
> = {
  live: {
    color: "#E8F5EE",
    stroke: "#2D6A4F",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2D6A4F"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  global: {
    color: "#E6F1FB",
    stroke: "#185FA5",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#185FA5"
        strokeWidth="1.8"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  competition: {
    color: "#F3EAF9",
    stroke: "#7B1FA2",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7B1FA2"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
      </svg>
    ),
  },
  find: {
    color: "#FAEEDA",
    stroke: "#854F0B",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#854F0B"
        strokeWidth="1.8"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
};

export function InternshipDiscovery({
  pageData,
}: {
  pageData: InternshipDiscoveryPageData;
}) {
  const { dict } = useLocale();
  const t = dict.student.internships;
  const { guardFunnelSubscriptionAction } = useStudentFeatureGate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [requestOpen, setRequestOpen] = useState(false);
  const [savedIds, setSavedIds] = useState(
    () => new Set(pageData.savedDiscoveryIds),
  );
  const [optimisticFilters, setOptimisticFilters] = useState(pageData.filters);

  useEffect(() => {
    setSavedIds(new Set(pageData.savedDiscoveryIds));
  }, [pageData.savedDiscoveryIds]);

  useEffect(() => {
    setOptimisticFilters(pageData.filters);
  }, [pageData.filters]);

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      startTransition(() => {
        router.replace(mergeSearchHref(pathname, searchParams, patch));
      });
    },
    [pathname, router, searchParams],
  );

  const onLocChange = (v: InternshipLocFilter) => {
    setOptimisticFilters((prev) => ({ ...prev, loc: v }));
    navigate({ loc: v === "any" ? undefined : v, page: undefined });
  };

  const onPayChange = (v: InternshipPayFilter) => {
    setOptimisticFilters((prev) => ({ ...prev, pay: v }));
    navigate({ pay: v === "any" ? undefined : v, page: undefined });
  };

  const onFavouritesChange = (on: boolean) => {
    setOptimisticFilters((prev) => ({ ...prev, favouritesOnly: on }));
    navigate({
      favourites: on ? "1" : undefined,
      page: undefined,
    });
  };

  const onClearFilters = () => {
    setOptimisticFilters({
      loc: "any",
      pay: "any",
      favouritesOnly: false,
    });
    navigate({
      loc: undefined,
      pay: undefined,
      favourites: undefined,
      page: undefined,
    });
  };

  const onPageChange = (page: number) => {
    navigate({ page: page <= 1 ? undefined : String(page) });
  };

  const openDetail = (id: string) => {
    navigate({ detail: id });
  };

  const closeDetail = () => {
    navigate({ detail: undefined });
  };

  const onToggleSave = async (id: string) => {
    const nextSaved = !savedIds.has(id);
    setSavedIds((prev) => {
      const n = new Set(prev);
      if (nextSaved) n.add(id);
      else n.delete(id);
      return n;
    });
    const result = nextSaved
      ? await saveInternship(id)
      : await unsaveInternship(id);
    if (!result.ok) {
      setSavedIds((prev) => {
        const n = new Set(prev);
        if (nextSaved) n.delete(id);
        else n.add(id);
        return n;
      });
      console.error(result.error || t.actionFailed);
    }
  };

  const sectionTitle = (section: InternshipSection): string => {
    switch (section) {
      case "live":
        return t.sectionLiveTitle;
      case "global":
        return t.sectionGlobalTitle;
      case "competition":
        return t.sectionCompetitionTitle;
      case "find":
        return t.sectionFindTitle;
    }
  };

  const sectionSub = (section: InternshipSection): string => {
    switch (section) {
      case "live":
        return t.sectionLiveSub;
      case "global":
        return t.sectionGlobalSub;
      case "competition":
        return t.sectionCompetitionSub;
      case "find":
        return t.sectionFindSub;
    }
  };

  const hasCatalog = pageData.catalogTotal > 0;
  const hasVisibleSections = pageData.sections.some(
    (s) => s.internships.length > 0,
  );
  const detailOpen = pageData.detailInternship !== null;

  return (
    <div className="internships-page mx-auto w-full min-w-0 max-w-[1100px] overflow-x-clip px-0 pb-16 pt-0">
      <header className="internship-page-header">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </header>

      <InternshipSelectorBar
        loc={optimisticFilters.loc}
        pay={optimisticFilters.pay}
        favouritesOnly={optimisticFilters.favouritesOnly}
        onLocChange={onLocChange}
        onPayChange={onPayChange}
        onFavouritesChange={onFavouritesChange}
        onClearFilters={onClearFilters}
      />

      <InternshipRequestCta
        onRequest={() => {
          if (!guardFunnelSubscriptionAction("internships")) return;
          setRequestOpen(true);
        }}
      />

      <div className="relative">
        {isPending ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-[var(--sand)]/50 pt-8"
            aria-hidden
          >
            <Loader2 className="size-6 animate-spin text-[var(--green)]" />
          </div>
        ) : null}

        {!hasCatalog ? (
          <InternshipEmptyCatalog />
        ) : !hasVisibleSections ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <>
            {pageData.sections.map((slice) => {
              const meta = SECTION_META[slice.section];
              return (
                <InternshipCategorySection
                  key={slice.section}
                  title={sectionTitle(slice.section)}
                  subtitle={sectionSub(slice.section)}
                  iconWrapStyle={{ background: meta.color }}
                  icon={meta.icon}
                  count={slice.internships.length}
                  internships={slice.internships}
                  onSelect={openDetail}
                />
              );
            })}
            <InternshipPaginationNav
              currentPage={pageData.page}
              totalPages={pageData.totalPages}
              totalItems={pageData.total}
              ariaLabel={t.paginationAria}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>

      <InternshipDetailOverlay
        internship={pageData.detailInternship}
        open={detailOpen}
        onClose={closeDetail}
        isSaved={
          pageData.detailInternship
            ? savedIds.has(pageData.detailInternship.slug)
            : false
        }
        onToggleSave={async () => {
          if (pageData.detailInternship) {
            await onToggleSave(pageData.detailInternship.slug);
          }
        }}
      />

      <InternshipRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
      />
    </div>
  );
}
