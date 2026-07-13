"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { ConfidenceLabel, ModuleResult } from "@/types/discovery";
import styles from "./discovery-journey.module.css";

function confidenceLabel(
  t: { confidence: Record<string, string> },
  label: ConfidenceLabel,
): string {
  return t.confidence[label] ?? label;
}

function confClass(label: ConfidenceLabel): string {
  if (label === "Strong signal") return styles.confStrong;
  if (label === "Balanced profile") return styles.confBalanced;
  return styles.confEmerging;
}

export function DiscoveryModuleResults({
  result,
  moduleTitle,
  onRetake,
  nextModuleHref,
}: {
  result: ModuleResult;
  moduleTitle: string;
  onRetake: () => void;
  nextModuleHref: string | null;
}) {
  const { dict } = useLocale();
  const t = dict.student.discoveryJourney;
  const profile = result.profile;
  const altProfiles = result.topProfiles.filter((p) => p.profile_id !== profile.profile_id);
  const topCatNames = result.topCategories.map((c) => c.category).join(", ");

  const hasMajors =
    profile.majors_strong.length > 0 ||
    profile.majors_related.length > 0 ||
    profile.majors_stretch.length > 0;

  return (
    <>
      <div className={styles.resultsHeader}>
        <div className={styles.resultsCelebrationIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className={styles.resultsEyebrow}>
          {t.yourSignals} · {moduleTitle.toUpperCase()}
        </div>
        <h1 className={styles.resultsMainTitle}>{profile.title}</h1>
        <div style={{ margin: "10px 0 4px" }}>
          <span className={`${styles.confBadge} ${confClass(result.confidence)}`}>
            {confidenceLabel(t, result.confidence)}
          </span>
        </div>
        {topCatNames ? (
          <p className={styles.resultsSummary}>
            {t.topCategories}: {topCatNames}
          </p>
        ) : null}
      </div>

      {result.flags.lowVariance ? (
        <div className={styles.lowVarianceNotice}>
          <div className={styles.lowVarianceNoticeIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div className={styles.lowVarianceNoticeText}>
            <strong>{t.lowVarianceTitle}</strong>
            {t.lowVarianceBody}
          </div>
        </div>
      ) : null}

      <section className={styles.resultSection}>
        <div className={styles.resultSectionEyebrow}>{t.topCategories}</div>
        <div className={styles.scoreBars}>
          {result.allScores.slice(0, 5).map((bar, i) => (
            <div key={bar.category} className={`${styles.scoreBar} ${i < 3 ? styles.scoreBarTop : ""}`}>
              <div className={styles.scoreBarLabel}>
                <span className={styles.scoreBarName}>{bar.category}</span>
                <span className={styles.scoreBarValue}>{bar.pct}%</span>
              </div>
              <div className={styles.scoreBarTrack}>
                <div className={styles.scoreBarFill} style={{ width: `${bar.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {altProfiles.length > 0 ? (
        <section className={styles.resultSection}>
          <div className={styles.resultSectionEyebrow}>{t.alternativeProfiles}</div>
          <div className={styles.altProfiles}>
            {altProfiles.slice(0, 2).map((p) => (
              <div key={p.profile_id} className={styles.altProfile}>
                <div className={styles.altProfileTitle}>{p.title}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasMajors ? (
        <section className={styles.resultSection}>
          <div className={styles.resultSectionEyebrow}>{t.recommendedMajors}</div>
          <div className={styles.majorsGrouped}>
            {profile.majors_strong.length > 0 ? (
              <div>
                <div className={styles.majGroupLabel}>{t.majorsStrong}</div>
                <div className={styles.recommendationsList}>
                  {profile.majors_strong.map((m) => (
                    <div key={m} className={styles.recommendationsItem}>{m}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {profile.majors_related.length > 0 ? (
              <div>
                <div className={styles.majGroupLabel}>{t.majorsRelated}</div>
                <div className={styles.recommendationsList}>
                  {profile.majors_related.map((m) => (
                    <div key={m} className={styles.recommendationsItem}>{m}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {profile.majors_stretch.length > 0 ? (
              <div>
                <div className={styles.majGroupLabel}>{t.majorsStretch}</div>
                <div className={styles.recommendationsList}>
                  {profile.majors_stretch.map((m) => (
                    <div key={m} className={styles.recommendationsItem}>{m}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {profile.careers.length > 0 ? (
            <>
              <div className={styles.majGroupLabel} style={{ marginTop: 16 }}>
                {t.careerIdeas}
              </div>
              <div className={styles.recommendationsList}>
                {profile.careers.map((c) => (
                  <div key={c} className={styles.recommendationsItem}>{c}</div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : profile.careers.length > 0 ? (
        <section className={styles.resultSection}>
          <div className={styles.resultSectionEyebrow}>{t.careerIdeas}</div>
          <div className={styles.recommendationsList}>
            {profile.careers.map((c) => (
              <div key={c} className={styles.recommendationsItem}>{c}</div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.resultSection}>
        <div className={styles.resultSectionEyebrow}>{t.nextActions.title}</div>
        <div className={styles.nextActionsGrid}>
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
          <Link href="/student/scholarships" className={styles.nextAction}>
            <div className={styles.nextActionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="6" />
                <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
              </svg>
            </div>
            <div className={styles.nextActionTitle}>Find scholarships</div>
            <div className={styles.nextActionSub}>By field and nationality</div>
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
        </div>
      </section>

      <div className={styles.resultDisclaimer}>{t.resultDisclaimer}</div>

      <div className={styles.resultsFooter}>
        <Link href="/student/discovery-journey" className={styles.btnOutline}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t.backToJourney}
        </Link>
        <div className={styles.resultsFooterActions}>
          <button type="button" className={styles.btnOutline} onClick={onRetake}>
            {t.retakeModule}
          </button>
          {nextModuleHref ? (
            <Link href={nextModuleHref} className={styles.btnPrimary}>
              {t.continueDiscovery}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ) : (
            <Link href="/student/discovery-journey/profile" className={styles.btnPrimary}>
              {t.viewProfile}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
