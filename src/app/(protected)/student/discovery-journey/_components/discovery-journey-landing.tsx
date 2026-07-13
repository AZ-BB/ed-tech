"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { StudentDiscoveryProfileResponse } from "@/types/discovery";
import {
  fetchDiscoveryModules,
  fetchDiscoveryProfile,
  type DiscoveryModuleListItem,
  type DiscoveryModulesResponse,
} from "../_lib/discovery-journey-api";
import { getModuleTheme } from "../_lib/discovery-journey-theme";
import { DiscoveryTopBar } from "./discovery-top-bar";
import { ModuleIcon } from "./module-icon";
import styles from "./discovery-journey.module.css";

function formatModuleNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (!digits) return num;
  return digits.padStart(2, "0");
}

function HeroProgressCard({
  modules,
  completedCount,
  totalModules,
  yourProgressLabel,
  journeyLabel,
  modulesLabel,
}: {
  modules: DiscoveryModuleListItem[];
  completedCount: number;
  totalModules: number;
  yourProgressLabel: string;
  journeyLabel: string;
  modulesLabel: string;
}) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const pct = totalModules > 0 ? completedCount / totalModules : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className={styles.heroProgress}>
      <div className={styles.heroProgressBadge}>
        <span className={styles.heroProgressBadgeDot} />
        {yourProgressLabel}
      </div>
      <div className={styles.heroProgressTitle}>{journeyLabel}</div>
      <div className={styles.heroProgressRingWrap}>
        <div className={styles.heroProgressRing}>
          <svg width="120" height="120" aria-hidden>
            <circle className={styles.heroProgressRingBg} cx="60" cy="60" r={r} />
            <circle
              className={styles.heroProgressRingFg}
              cx="60"
              cy="60"
              r={r}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className={styles.heroProgressRingText}>
            <div className={styles.heroProgressNum}>
              {completedCount}/{totalModules}
            </div>
            <div className={styles.heroProgressOf}>{modulesLabel}</div>
          </div>
        </div>
      </div>
      <div className={styles.heroProgressList}>
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`${styles.heroProgressItem} ${mod.completed ? styles.heroProgressItemDone : ""}`}
          >
            <span
              className={`${styles.heroProgressDot} ${mod.completed ? styles.heroProgressDotDone : ""}`}
            />
            <span className={styles.heroProgressItemLabel}>{mod.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryJourneyLanding() {
  const router = useRouter();
  const { dict } = useLocale();
  const t = dict.student.discoveryJourney;

  const [modulesData, setModulesData] = useState<DiscoveryModulesResponse | null>(null);
  const [profile, setProfile] = useState<StudentDiscoveryProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, prof] = await Promise.all([
        fetchDiscoveryModules(),
        fetchDiscoveryProfile(),
      ]);
      setModulesData(mods);
      setProfile(prof);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const modules = modulesData?.modules ?? [];

  const completedModuleIds = useMemo(() => {
    const set = new Set<string>();
    for (const mod of modules) {
      if (mod.completed) set.add(mod.id);
    }
    for (const id of profile?.completedModules ?? []) {
      set.add(id);
    }
    return set;
  }, [modules, profile?.completedModules]);

  const modulesWithStatus = useMemo(
    () =>
      modules.map((mod) => ({
        ...mod,
        completed: completedModuleIds.has(mod.id),
      })),
    [modules, completedModuleIds],
  );

  const completedCount =
    profile?.completedCount ?? modulesWithStatus.filter((m) => m.completed).length;
  const totalModules = profile?.totalModules ?? modulesWithStatus.length;

  const firstIncomplete = useMemo(
    () => modulesWithStatus.find((m) => !m.completed),
    [modulesWithStatus],
  );

  const resultByModule = useMemo(() => {
    const map = new Map<string, { topCats: string[] }>();
    for (const r of profile?.moduleResults ?? []) {
      map.set(r.moduleId, {
        topCats: r.topCategories.slice(0, 2).map((c) => c.category),
      });
    }
    return map;
  }, [profile?.moduleResults]);

  const profileChips = useMemo(() => {
    return (profile?.moduleResults ?? [])
      .map((r) => r.profile.title.replace(/^The /, ""))
      .slice(0, 4);
  }, [profile?.moduleResults]);

  const topBar = (
    <DiscoveryTopBar
      title={t.pageTitle}
      menuAriaLabel={t.openMenu}
    />
  );

  if (loading) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.loadingState}>{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.errorBanner}>{error}</div>
        <button type="button" className={styles.btnPrimary} onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>{t.emptyTitle}</h2>
          <p className={styles.emptyStateSub}>{t.emptySub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {topBar}

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>
            {t.heroTitle} <em>{t.heroTitleEm}</em>
          </h1>
          <p className={styles.heroSub}>{t.heroSub}</p>
          <div className={styles.heroActions}>
            <Link
              href={
                firstIncomplete
                  ? `/student/discovery-journey/${firstIncomplete.id}`
                  : "/student/discovery-journey/profile"
              }
              className={styles.btnPrimary}
            >
              {t.startJourney}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="/student/discovery-journey/profile" className={styles.btnSecondary}>
              {t.viewProfile}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <HeroProgressCard
          modules={modulesWithStatus}
          completedCount={completedCount}
          totalModules={totalModules}
          yourProgressLabel={t.yourProgress}
          journeyLabel={t.pageTitle}
          modulesLabel={t.modulesLabel}
        />
      </div>

      {completedCount > 0 ? (
        <div className={styles.profilePreview}>
          <div className={styles.profilePreviewEyebrow}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-bright)", display: "inline-block" }} />
            {t.myDiscoveryProfile}
          </div>
          <h3 className={styles.profilePreviewTitle}>
            {profile?.combinedProfile?.title ?? t.myDiscoveryProfile}
          </h3>
          <p className={styles.profilePreviewSummary}>
            {profile?.combinedProfile?.summary ?? t.profilePreviewPartialSummary}
          </p>
          {profileChips.length > 0 ? (
            <div className={styles.profilePreviewChips}>
              {profileChips.map((chip) => (
                <span key={chip} className={styles.profilePreviewChip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          <Link href="/student/discovery-journey/profile" className={styles.profilePreviewCta}>
            {t.viewFullProfile}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      ) : null}

      <div className={styles.sectionHeader}>
        <h2>
          {t.sectionTitle} <em>{t.sectionTitleEm}</em>
        </h2>
        <div className={styles.sectionMeta}>{t.sectionMeta}</div>
      </div>

      <div className={styles.moduleGrid}>
        {modulesWithStatus.map((mod) => {
          const theme = getModuleTheme(mod.id);
          const result = resultByModule.get(mod.id);
          const href = `/student/discovery-journey/${mod.id}`;
          const statusClass = mod.completed
            ? styles.statusCompleted
            : styles.statusNotStarted;
          const ctaLabel = t.takeTest;
          const moduleNum = formatModuleNumber(mod.number);
          const questionCount = mod.questions?.length ?? mod.numItems;
          const displayChips = result?.topCats.length
            ? result.topCats
            : theme.outputChips;

          return (
            <article
              key={mod.id}
              className={styles.moduleCard}
              onClick={() => router.push(href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(href);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className={styles.moduleCardHeader}>
                <div className={styles.moduleIcon}>
                  <ModuleIcon icon={theme.icon} size={24} />
                </div>
                <span className={`${styles.moduleStatus} ${statusClass}`}>
                  <span className={styles.moduleStatusDot} />
                  {mod.completed ? t.statusCompleted : t.statusNotStarted}
                </span>
              </div>

              <div>
                <div className={styles.moduleNum}>MODULE {moduleNum}</div>
                <div className={styles.moduleTitle}>{mod.title}</div>
                <div className={styles.moduleSubtitle}>
                  {mod.subtitle ?? "\u00A0"}
                </div>
              </div>

              {mod.description ? <div className={styles.moduleDesc}>{mod.description}</div> : null}

              <div className={styles.moduleChips}>
                {displayChips.map((chip) => (
                  <span key={chip} className={styles.moduleChip}>
                    {chip}
                  </span>
                ))}
              </div>

              <div className={styles.moduleMeta}>
                <div className={styles.moduleMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {theme.timeLabel}
                </div>
                <div className={styles.moduleMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  {questionCount} {t.questions}
                </div>
              </div>

              <div className={styles.moduleCardFooter}>
                <button
                  type="button"
                  className={styles.moduleCta}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(href);
                  }}
                >
                  {ctaLabel}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                {mod.completed ? (
                  <button
                    type="button"
                    className={styles.moduleCtaOutline}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`${href}?retake=1`);
                    }}
                  >
                    {t.retake}
                  </button>
                ) : null}
              </div>

              <div className={styles.moduleHelper}>{t.moduleHelper}</div>
            </article>
          );
        })}
      </div>

      <div className={styles.disclaimer}>
        <strong>{t.aboutResults}</strong> {t.disclaimer}
      </div>
    </div>
  );
}
