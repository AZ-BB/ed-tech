"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { StudentDiscoveryProfileResponse } from "@/types/discovery";
import { fetchDiscoveryProfile } from "../_lib/discovery-journey-api";
import { DiscoveryTestHeader } from "./discovery-top-bar";
import styles from "./discovery-journey.module.css";

export function DiscoveryJourneyProfile() {
  const { dict } = useLocale();
  const t = dict.student.discoveryJourney;
  const tp = t.profilePage;

  const [profile, setProfile] = useState<StudentDiscoveryProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchDiscoveryProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const moduleTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of profile?.earlySignals ?? []) {
      map.set(s.moduleId, s.moduleTitle);
    }
    return map;
  }, [profile?.earlySignals]);

  const allMajors = useMemo(() => {
    const set = new Set<string>();
    for (const r of profile?.moduleResults ?? []) {
      for (const m of r.profile.majors_strong) set.add(m);
      for (const m of r.profile.majors_related) set.add(m);
    }
    return [...set].slice(0, 8);
  }, [profile?.moduleResults]);

  const allCareers = useMemo(() => {
    const set = new Set<string>();
    for (const r of profile?.moduleResults ?? []) {
      for (const c of r.profile.careers) set.add(c);
    }
    return [...set].slice(0, 8);
  }, [profile?.moduleResults]);

  const pct =
    profile && profile.totalModules > 0
      ? Math.round((profile.completedCount / profile.totalModules) * 100)
      : 0;

  if (loading) {
    return (
      <div className={styles.profilePage}>
        <DiscoveryTestHeader backLabel={t.backToJourney} />
        <div className={styles.loadingState}>{t.loading}</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.profilePage}>
        <DiscoveryTestHeader backLabel={t.backToJourney} />
        <div className={styles.errorBanner}>{error ?? t.loadError}</div>
      </div>
    );
  }

  const combined = profile.combinedProfile;

  return (
    <div className={styles.profilePage}>
      <DiscoveryTestHeader backLabel={t.backToJourney} />

      <div className={styles.profileHero}>
        <div className={styles.profileHeroEyebrow}>{t.myDiscoveryProfile}</div>
        <h1 className={styles.profileHeroTitle}>
          {combined?.title ?? tp.noProfileYet}
        </h1>
        {combined?.summary ? (
          <p className={styles.profileHeroSummary}>{combined.summary}</p>
        ) : profile.completedCount < profile.totalModules ? (
          <p className={styles.profileHeroSummary}>{tp.incompleteSub}</p>
        ) : null}
        <div className={styles.profileHeroProgress}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {profile.completedCount} of {profile.totalModules} {t.modulesComplete} ({pct}%)
        </div>
      </div>

      {profile.earlySignals.length > 0 ? (
        <div className={styles.profileGrid}>
          <section className={styles.profileCard}>
            <div className={styles.profileCardEyebrow}>{tp.earlySignals}</div>
            <h2 className={styles.profileCardTitle}>{t.myDiscoveryProfile}</h2>
            <div className={styles.profileTags}>
              {profile.earlySignals.map((s) => (
                <span key={s.moduleId} className={styles.profileTag}>
                  {s.moduleTitle}: {s.topCategory}
                </span>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className={styles.profileGrid}>
        {allMajors.length > 0 ? (
          <section className={styles.profileCard}>
            <div className={styles.profileCardEyebrow}>{tp.suggestedMajors}</div>
            <h2 className={styles.profileCardTitle}>{tp.suggestedMajors}</h2>
            <div className={styles.profileTags}>
              {allMajors.map((m) => (
                <span key={m} className={styles.profileTag}>{m}</span>
              ))}
            </div>
          </section>
        ) : null}

        {allCareers.length > 0 ? (
          <section className={styles.profileCard}>
            <div className={styles.profileCardEyebrow}>{tp.suggestedCareers}</div>
            <h2 className={styles.profileCardTitle}>{tp.suggestedCareers}</h2>
            <div className={styles.profileTags}>
              {allCareers.map((c) => (
                <span key={c} className={styles.profileTag}>{c}</span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {profile.moduleResults.length > 0 ? (
        <section className={styles.profileCard} style={{ marginBottom: 18 }}>
          <div className={styles.profileCardEyebrow}>{tp.moduleResults}</div>
          <h2 className={styles.profileCardTitle}>{tp.moduleResults}</h2>
          <div className={styles.profileCardList}>
            {profile.moduleResults.map((r) => (
              <Link
                key={r.moduleId}
                href={`/student/discovery-journey/${r.moduleId}`}
                className={styles.profileCardListItem}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  {moduleTitleById.get(r.moduleId) ?? r.moduleId} — {r.profile.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.profileCard}>
        <div className={styles.profileCardEyebrow}>{t.nextActions.title}</div>
        <h2 className={styles.profileCardTitle}>{t.nextActions.title}</h2>
        <div className={styles.nextActionsGrid} style={{ marginTop: 14 }}>
          <Link href="/student/universities" className={styles.nextAction}>
            <div className={styles.nextActionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 7l10-5 10 5-10 5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className={styles.nextActionTitle}>{t.nextActions.programs}</div>
            <div className={styles.nextActionSub}>{t.nextActions.programsSub}</div>
          </Link>
          <Link href="/student/advisor-sessions" className={styles.nextAction}>
            <div className={styles.nextActionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className={styles.nextActionTitle}>{t.nextActions.advisor}</div>
            <div className={styles.nextActionSub}>{t.nextActions.advisorSub}</div>
          </Link>
          <Link href="/student/scholarships" className={styles.nextAction}>
            <div className={styles.nextActionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="6" />
                <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
              </svg>
            </div>
            <div className={styles.nextActionTitle}>Find scholarships</div>
            <div className={styles.nextActionSub}>By major and field</div>
          </Link>
        </div>
      </section>

      <div className={styles.resultsFooter}>
        <Link href="/student/discovery-journey" className={styles.btnOutline}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t.backToJourney}
        </Link>
      </div>
    </div>
  );
}
