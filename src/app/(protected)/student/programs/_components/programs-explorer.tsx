"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowBackIcon } from "../../_components/directional-icons";
import {
  HERO_FLOAT_PROGRAMS,
  PROGRAM_QUICK_CHIPS,
  PROGRAM_RAILS,
  PROGRAM_SECTION_DISPLAY_LIMIT,
} from "../_lib/program-discovery-constants";
import {
  localizeInterestTiles,
  localizeProgramRail,
} from "../_lib/program-discovery-i18n";
import type { ProgramExplorerPageData } from "../_lib/get-program-explorer-page";
import { resolvePopularProgramSlug } from "../_lib/resolve-popular-program-slug";
import {
  formatInterestMeta,
  InterestTileIcon,
} from "./program-interest-icons";
import { ProgramExplorerCard } from "./program-explorer-card";
import { ProgramRailSection } from "./program-rail-section";
import explorerStyles from "./programs-explorer.module.css";

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

export function ProgramsExplorer({
  pageData,
}: {
  pageData: ProgramExplorerPageData;
}) {
  const { dict, locale } = useLocale();
  const t = dict.student.programs;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(pageData.filters.q);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(
    pageData.selectedInterest,
  );

  useEffect(() => {
    setSearchValue(pageData.filters.q);
  }, [pageData.filters.q]);

  useEffect(() => {
    setSelectedInterest(pageData.selectedInterest);
  }, [pageData.selectedInterest]);

  useEffect(() => {
    const onPopState = () => {
      const interest =
        new URLSearchParams(window.location.search).get("interest")?.trim() ||
        null;
      setSelectedInterest(interest);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!selectedInterest) return;
    window.scrollTo(0, 0);
  }, [selectedInterest]);

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      startTransition(() => {
        router.replace(mergeSearchHref(pathname, searchParams, patch));
      });
    },
    [pathname, router, searchParams],
  );

  const setInterest = useCallback(
    (interest: string | undefined) => {
      const next = interest?.trim() || null;
      setSelectedInterest(next);
      const url = mergeSearchHref(pathname, searchParams, {
        interest: next ?? undefined,
      });
      window.history.pushState(null, "", url);
    },
    [pathname, searchParams],
  );

  const clearInterest = useCallback(() => {
    setSelectedInterest(null);
    const url = mergeSearchHref(pathname, searchParams, { interest: undefined });
    window.history.replaceState(null, "", url);
  }, [pathname, searchParams]);

  const rails = useMemo(
    () =>
      PROGRAM_RAILS.map((rail) => ({
        ...localizeProgramRail(rail, t),
        programs: pageData.programs
          .filter((program) =>
            rail.filter({
              salaryPotential: program.salaryPotential,
              aiResilience: program.aiResilience,
              category: program.category,
              characteristicIds: program.characteristicIds,
            }),
          )
          .slice(0, PROGRAM_SECTION_DISPLAY_LIMIT),
      })).filter((rail) => rail.programs.length > 0),
    [pageData.programs, t],
  );

  const localizedTiles = useMemo(
    () => localizeInterestTiles(pageData.interestTiles, t),
    [pageData.interestTiles, t],
  );

  const popularChips = useMemo(
    () =>
      PROGRAM_QUICK_CHIPS.map((label) => ({
        label,
        slug: resolvePopularProgramSlug(pageData.programs, label),
      })),
    [pageData.programs],
  );

  const floatLabels = useMemo(() => {
    return HERO_FLOAT_PROGRAMS.map((englishLabel, index) => {
      if (locale === "ar") {
        return t.heroFloatLabels[index] ?? englishLabel;
      }
      const match = pageData.programs.find(
        (program) => program.title.toLowerCase() === englishLabel.toLowerCase(),
      );
      return match?.title ?? t.heroFloatLabels[index] ?? englishLabel;
    });
  }, [locale, pageData.programs, t]);

  const selectedTile = localizedTiles.find(
    (tile) => tile.characteristicId === selectedInterest,
  );

  const interestPrograms = useMemo(
    () =>
      selectedInterest
        ? pageData.programs.filter((program) =>
            program.characteristicIds.includes(selectedInterest),
          )
        : [],
    [pageData.programs, selectedInterest],
  );

  const isSearchActive = Boolean(pageData.filters.q.trim());

  if (selectedInterest && selectedTile) {
    return (
      <div id="programs-discovery-scope" className={explorerStyles.page}>
        <div className={explorerStyles.selView}>
          <nav className={explorerStyles.selBreadcrumb} aria-label="Breadcrumb">
            <button
              type="button"
              className={explorerStyles.selBreadcrumbLink}
              onClick={clearInterest}
            >
              {t.pageTitle}
            </button>
            <span className={explorerStyles.selBcSep} aria-hidden>
              /
            </span>
            <span>{selectedTile.listTitle}</span>
          </nav>

          <button
            type="button"
            className={explorerStyles.selBackBtn}
            onClick={clearInterest}
          >
            <ArrowBackIcon size={14} strokeWidth={2.5} />
            {t.backToExplorer}
          </button>

          <div className={explorerStyles.selCatHeader}>
            <div className={explorerStyles.sectionEyebrow}>
              {selectedTile.listEyebrow}
            </div>
            <h1 className={explorerStyles.selCatTitle}>{selectedTile.listTitle}</h1>
            <p className={explorerStyles.selCatSub}>{selectedTile.listSubtitle}</p>
            <span className={explorerStyles.selCatCount}>
              {t.programsCount.replace(
                "{count}",
                String(interestPrograms.length),
              )}
            </span>
          </div>

          {selectedTile.listNote ? (
            <div className={explorerStyles.catNote}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>{selectedTile.listNote}</div>
            </div>
          ) : null}

          {interestPrograms.length === 0 ? (
            <div className={explorerStyles.emptyState}>{t.noMatch}</div>
          ) : (
            <div className={explorerStyles.selProgramGrid}>
              {interestPrograms
                .slice(0, PROGRAM_SECTION_DISPLAY_LIMIT)
                .map((program) => (
                <ProgramExplorerCard
                  key={program.id}
                  program={program}
                  grid
                  salaryLabel={t.cardSalaryLabel}
                  demandLabel={t.cardDemandLabel}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="programs-discovery-scope" className={explorerStyles.page}>
      <section className={explorerStyles.hero}>
        <div className={explorerStyles.floats} aria-hidden>
          <div className={`${explorerStyles.floatCard} ${explorerStyles.floatCardF1}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {floatLabels[0]}
          </div>
          <div className={`${explorerStyles.floatCard} ${explorerStyles.floatCardF2}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {floatLabels[1]}
          </div>
          <div className={`${explorerStyles.floatCard} ${explorerStyles.floatCardF3}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            {floatLabels[2]}
          </div>
        </div>

        <div className={explorerStyles.heroEyebrow}>
          <span className={explorerStyles.heroEyebrowDot} />
          {t.heroEyebrow}
        </div>
        <h1
          className={explorerStyles.heroTitle}
          dangerouslySetInnerHTML={{ __html: t.heroTitle }}
        />
        <p className={explorerStyles.heroSub}>{t.heroSubtitle}</p>

        <div className={explorerStyles.searchRow}>
          <div className={explorerStyles.searchBox}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                navigate({ q: searchValue.trim() || undefined });
              }}
              placeholder={t.searchPlaceholder}
            />
          </div>
          <Link href="/student/program-fit-test" className={explorerStyles.btnAi}>
            <span className={explorerStyles.btnAiIcon}>✦</span>
            {t.helpChooseCta}
          </Link>
        </div>

        {popularChips.some((chip) => chip.slug) ? (
          <div className={explorerStyles.quickChips}>
            <span className={explorerStyles.quickLabel}>{t.popularLabel}</span>
            {popularChips
              .filter((chip) => chip.slug)
              .map(({ label, slug }) => (
                <Link
                  key={label}
                  href={`/student/programs/${slug}`}
                  className={explorerStyles.quickChip}
                >
                  {label}
                </Link>
              ))}
          </div>
        ) : null}
      </section>

      {isPending ? (
        <div className="mb-6 text-center text-[14px] text-[var(--text-light)]">
          {t.loading}
        </div>
      ) : null}

      {isSearchActive ? (
        <section className={explorerStyles.sectionBlock}>
          <div className={explorerStyles.searchResultsHeader}>
            <div>
              <div className={explorerStyles.sectionEyebrow}>
                {t.searchResultsEyebrow}
              </div>
              <h2 className={explorerStyles.sectionTitle}>
                {t.searchResultsTitle.replace("{query}", pageData.filters.q)}
              </h2>
              <p className={explorerStyles.sectionSub}>
                {t.programsCount.replace(
                  "{count}",
                  String(pageData.programs.length),
                )}
              </p>
            </div>
            <button
              type="button"
              className={explorerStyles.clearSearchBtn}
              onClick={() => {
                setSearchValue("");
                navigate({ q: undefined });
              }}
            >
              {t.clearSearch}
            </button>
          </div>

          {pageData.programs.length === 0 ? (
            <div className={explorerStyles.emptyState}>{t.noMatch}</div>
          ) : (
            <div className={explorerStyles.selProgramGrid}>
              {pageData.programs.map((program) => (
                <ProgramExplorerCard
                  key={program.id}
                  program={program}
                  grid
                  salaryLabel={t.cardSalaryLabel}
                  demandLabel={t.cardDemandLabel}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className={explorerStyles.featuredBanner}>
        <div className={explorerStyles.fbIcon} aria-hidden>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
        <p className={explorerStyles.fbText}>
          <strong>{t.fitTestBannerStrong}</strong> {t.fitTestBannerText}
        </p>
        <Link href="/student/program-fit-test" className={explorerStyles.fbCta}>
          {t.startFitTestCta}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="icon-directional"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <section className={explorerStyles.sectionBlock}>
        <div className={explorerStyles.sectionEyebrow}>{t.interestEyebrow}</div>
        <h2 className={explorerStyles.sectionTitle}>{t.interestTitle}</h2>
        <p className={explorerStyles.sectionSub}>{t.interestSubtitle}</p>
        <div className={explorerStyles.interestGrid}>
          {localizedTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className={explorerStyles.interestTile}
              onClick={() => setInterest(tile.characteristicId)}
            >
              <div className={explorerStyles.interestIcon} aria-hidden>
                <InterestTileIcon tileId={tile.id} />
              </div>
              <div className={explorerStyles.interestTitle}>{tile.title}</div>
              <div className={explorerStyles.interestMeta}>
                {formatInterestMeta(tile, tile.count ?? 0, t.interestProgramsMeta)}
              </div>
            </button>
          ))}
        </div>
      </section>

      {rails.map((rail) => (
        <ProgramRailSection
          key={rail.id}
          eyebrow={rail.eyebrow}
          title={rail.title}
          programs={rail.programs}
          salaryLabel={t.cardSalaryLabel}
          demandLabel={t.cardDemandLabel}
          scrollPreviousLabel={t.scrollPrevious}
          scrollNextLabel={t.scrollNext}
        />
      ))}
        </>
      )}

      {!isSearchActive ? (
      <div className={explorerStyles.bottomCta}>
        <div className={explorerStyles.bottomCtaText}>
          <div className={explorerStyles.bottomCtaEyebrow}>{t.bottomCtaEyebrow}</div>
          <h2 className={explorerStyles.bottomCtaTitle}>{t.bottomCtaTitle}</h2>
          <p className={explorerStyles.bottomCtaSub}>{t.bottomCtaSubtitle}</p>
        </div>
        <Link href="/student/program-fit-test" className={explorerStyles.bottomCtaBtn}>
          {t.bottomCtaBtn}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="icon-directional"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      ) : null}
    </div>
  );
}
