"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "@/lib/i18n/locale-context";
import type { ProgramDiscoveryPageData } from "../_lib/get-program-discovery-page";
import { ProgramCard } from "./program-card";
import { ProgramDetailOverlay } from "./program-detail-overlay";

function mergeSearchHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ProgramDiscovery({
  pageData,
}: {
  pageData: ProgramDiscoveryPageData;
}) {
  const { dict } = useLocale();
  const t = dict.student.programs;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(pageData.filters.q);

  useEffect(() => {
    setSearchValue(pageData.filters.q);
  }, [pageData.filters.q]);

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      startTransition(() => {
        router.replace(mergeSearchHref(pathname, searchParams, patch));
      });
    },
    [pathname, router, searchParams],
  );

  const detailOpen = pageData.detailProgram !== null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[var(--text)]">{t.pageTitle}</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--text-mid)]">
          {t.pageSubtitle}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            navigate({ q: searchValue.trim() || undefined, page: "1" });
          }}
          placeholder={t.searchPlaceholder}
          className="min-w-[240px] flex-1 rounded-[10px] border border-[var(--border-light)] px-4 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
        />
        <select
          value={pageData.filters.category}
          onChange={(event) =>
            navigate({
              category: event.target.value || undefined,
              page: "1",
            })
          }
          className="rounded-[10px] border border-[var(--border-light)] px-3 py-2.5 text-[13px]"
        >
          <option value="">{t.allCategories}</option>
          {pageData.categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13px] text-[var(--text-mid)]">
          <input
            type="checkbox"
            checked={pageData.filters.featuredOnly}
            onChange={(event) =>
              navigate({
                featured: event.target.checked ? "1" : undefined,
                page: "1",
              })
            }
          />
          {t.featuredOnly}
        </label>
        {(pageData.filters.q ||
          pageData.filters.category ||
          pageData.filters.featuredOnly) && (
          <button
            type="button"
            onClick={() =>
              navigate({
                q: undefined,
                category: undefined,
                featured: undefined,
                page: "1",
              })
            }
            className="text-[13px] font-semibold text-[var(--green)]"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {isPending ? (
        <div className="py-8 text-center text-[14px] text-[var(--text-light)]">
          {t.loading}
        </div>
      ) : null}

      {pageData.total === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[var(--border-light)] px-6 py-16 text-center text-[14px] text-[var(--text-light)]">
          {t.noMatch}
        </div>
      ) : (
        <div className="space-y-8">
          {pageData.categories.map((section) => (
            <section key={section.category}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-bold text-[var(--text)]">
                  {section.category}
                </h2>
                <span className="text-[12px] text-[var(--text-light)]">
                  {t.programsCount.replace(
                    "{count}",
                    String(section.programs.length),
                  )}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onOpenDetail={() =>
                      navigate({ program: program.slug, page: String(pageData.page) })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {pageData.totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={pageData.page <= 1}
            onClick={() => navigate({ page: String(pageData.page - 1) })}
            className="rounded-[8px] border border-[var(--border-light)] px-3 py-2 text-[12px] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-[12px] text-[var(--text-mid)]">
            {pageData.page} / {pageData.totalPages}
          </span>
          <button
            type="button"
            disabled={pageData.page >= pageData.totalPages}
            onClick={() => navigate({ page: String(pageData.page + 1) })}
            className="rounded-[8px] border border-[var(--border-light)] px-3 py-2 text-[12px] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}

      {detailOpen && pageData.detailProgram ? (
        <ProgramDetailOverlay
          program={pageData.detailProgram}
          onClose={() => navigate({ program: undefined })}
        />
      ) : null}
    </div>
  );
}
