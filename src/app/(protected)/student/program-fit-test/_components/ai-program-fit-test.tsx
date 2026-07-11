"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ProgramFitMatchResponse } from "@/app/api/ai/program-matching/route";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  PROGRAM_FIT_TEST_STEPS,
  type FitTestQuestionDef,
  type FitTestStepDef,
  type ProgramFitTestAnswers,
} from "@/lib/program-fit-test-steps";

import styles from "./ai-program-fit-test.module.css";

type Screen = "intro" | "quiz" | "loading" | "results";

type StepOptionsDict = (typeof import("@/lib/i18n/dictionaries/program-fit-test-options-en"))["programFitTestOptionsEn"]["steps"];

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(val));
  }
  return out;
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Business: "💰",
    Technology: "💻",
    Healthcare: "🩺",
    Creative: "🎨",
    Engineering: "⚙️",
    Sciences: "🔬",
    "Law & Policy": "⚖️",
    Media: "🎬",
    Education: "📚",
  };
  return map[category] ?? "🎓";
}

function getStepCopy(step: FitTestStepDef, options: StepOptionsDict) {
  const stepOpts = options[step.key as keyof StepOptionsDict] as {
    label: string;
    title: string;
    intro: string;
    questions: Record<string, unknown>;
  };
  return stepOpts;
}

function getQuestionCopy(
  step: FitTestStepDef,
  question: FitTestQuestionDef,
  options: StepOptionsDict,
) {
  const stepOpts = getStepCopy(step, options);
  return stepOpts.questions[question.id] as Record<string, unknown>;
}

function isStepValid(step: FitTestStepDef, answers: ProgramFitTestAnswers): boolean {
  for (const q of step.questions) {
    const val = answers[q.id];
    if (q.type === "multi") {
      if (!Array.isArray(val) || val.length === 0) return false;
    } else if (q.type === "single") {
      if (typeof val !== "string" || !val) return false;
    } else if (q.type === "scale") {
      if (typeof val !== "number") return false;
    }
  }
  return true;
}

function buildLabeledAnswers(
  answers: ProgramFitTestAnswers,
  options: StepOptionsDict,
): Record<string, string | string[] | number> {
  const labeled: Record<string, string | string[] | number> = {};

  for (const step of PROGRAM_FIT_TEST_STEPS) {
    const stepOpts = getStepCopy(step, options);
    for (const q of step.questions) {
      const val = answers[q.id];
      if (val === undefined) continue;
      const qCopy = stepOpts.questions[q.id] as Record<string, unknown>;

      if (q.type === "scale") {
        labeled[q.id] = val as number;
        continue;
      }

      const optMap = (qCopy.options ?? {}) as Record<string, string>;
      if (Array.isArray(val)) {
        labeled[q.id] = val.map((v) => optMap[v] ?? v);
      } else {
        labeled[q.id] = optMap[val as string] ?? (val as string);
      }
    }
  }

  return labeled;
}

function HtmlText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function AiProgramFitTest() {
  const { dict, locale } = useLocale();
  const t = dict.student.programFitTest;
  const options = t.options.steps as StepOptionsDict;
  const careerSignals = t.options.careerSignals as Record<string, string>;

  const totalSteps = PROGRAM_FIT_TEST_STEPS.length;

  const [screen, setScreen] = useState<Screen>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<ProgramFitTestAnswers>({});
  const [result, setResult] = useState<ProgramFitMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const currentStep = PROGRAM_FIT_TEST_STEPS[stepIndex];
  const stepValid = currentStep ? isStepValid(currentStep, answers) : false;
  const progressPct = screen === "quiz" ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const stepCopy = useMemo(
    () => (currentStep ? getStepCopy(currentStep, options) : null),
    [currentStep, options],
  );

  useEffect(() => {
    if (screen !== "loading") return;
    setLoadingMsgIndex(0);
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => {
        if (i >= t.loadingMessages.length - 1) {
          clearInterval(interval);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [screen, t.loadingMessages.length]);

  const toggleMulti = useCallback((qid: string, val: string, max: number) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[qid]) ? [...(prev[qid] as string[])] : [];
      const idx = existing.indexOf(val);
      if (idx >= 0) {
        existing.splice(idx, 1);
      } else if (existing.length < max) {
        existing.push(val);
      }
      return { ...prev, [qid]: existing };
    });
  }, []);

  const setSingle = useCallback((qid: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  }, []);

  const setScale = useCallback((qid: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  }, []);

  const submitTest = useCallback(async () => {
    setScreen("loading");
    setError(null);

    try {
      const res = await fetch("/api/ai/program-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          labeledAnswers: buildLabeledAnswers(answers, options),
          locale,
        }),
      });

      const data = (await res.json()) as ProgramFitMatchResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t.somethingWrong);
      }

      setResult(data);
      setScreen("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.networkError);
      setScreen("quiz");
    }
  }, [answers, locale, options, t.networkError, t.somethingWrong]);

  const handleNext = () => {
    if (!stepValid) return;
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void submitTest();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const restart = () => {
    setScreen("intro");
    setStepIndex(0);
    setAnswers({});
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderQuestion = (step: FitTestStepDef, question: FitTestQuestionDef) => {
    const qCopy = getQuestionCopy(step, question, options);

    if (question.type === "multi" || question.type === "single") {
      const isMulti = question.type === "multi";
      const selected = answers[question.id];
      const optMap = (qCopy.options ?? {}) as Record<string, string>;
      const optionKeys = question.options.map((o) => o.v);

      return (
        <div key={question.id} className={styles.qBlock}>
          <div className={styles.qPrompt}>{String(qCopy.prompt)}</div>
          {qCopy.hint ? <div className={styles.qHint}>{String(qCopy.hint)}</div> : null}
          <div
            className={`${styles.qOptions} ${optionKeys.length > 6 ? "" : ""} ${!isMulti && optionKeys.length > 4 ? styles.qOptionsSingleCol : ""}`}
          >
            {optionKeys.map((v) => {
              const isSelected = isMulti
                ? Array.isArray(selected) && selected.includes(v)
                : selected === v;
              return (
                <button
                  key={v}
                  type="button"
                  className={`${styles.qOpt} ${!isMulti ? styles.qOptRadio : ""} ${isSelected ? styles.qOptSelected : ""}`}
                  onClick={() =>
                    isMulti
                      ? toggleMulti(question.id, v, question.max)
                      : setSingle(question.id, v)
                  }
                >
                  <span className={styles.qOptCheck}>
                    {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  {optMap[v]}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === "scale") {
      const selected = answers[question.id];
      const buttons = [];
      for (let n = question.min; n <= question.max; n++) {
        buttons.push(
          <button
            key={n}
            type="button"
            className={`${styles.qScaleBtn} ${selected === n ? styles.qScaleBtnSelected : ""}`}
            onClick={() => setScale(question.id, n)}
          >
            {n}
          </button>,
        );
      }
      return (
        <div key={question.id} className={styles.qBlock}>
          <div className={styles.qPrompt}>{String(qCopy.prompt)}</div>
          <div className={styles.qScale}>
            <div className={styles.qScaleRow}>{buttons}</div>
            <div className={styles.qScaleLabels}>
              <span>{String(qCopy.leftLabel)}</span>
              <span>{String(qCopy.rightLabel)}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.tbLeft}>
          <div className={styles.tbIcon}>
            <Sparkles size={18} />
          </div>
          <div className={styles.topBarTitle}>{t.heroTitle}</div>
        </div>
        <Link href="/student/programs" className={styles.backLink}>
          <ArrowLeft size={14} />
          {t.backToPrograms}
        </Link>
      </div>

      {screen === "intro" ? (
        <section className={styles.hero}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            {t.eyebrow}
          </div>
          <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
          <p className={styles.heroSub}>{t.heroSubtitle}</p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>
              <Check size={13} />
              {t.badgeSteps}
            </span>
            <span className={styles.heroBadge}>
              <Sparkles size={13} />
              {t.badgePersonalised}
            </span>
          </div>
          <button
            type="button"
            className={styles.heroCta}
            onClick={() => {
              setScreen("quiz");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {t.startBtn}
            <ArrowRight size={16} />
          </button>
          <p className={styles.heroDisclaimer}>{t.heroDisclaimer}</p>
        </section>
      ) : null}

      {screen === "quiz" && currentStep && stepCopy ? (
        <section>
          {error ? <div className={styles.errorBanner}>{error}</div> : null}
          <div className={styles.qProgressWrap}>
            <div className={styles.qProgressMeta}>
              <div className={styles.qStepLabel}>
                {formatTemplate(t.stepOf, { current: stepIndex + 1, total: totalSteps })} —{" "}
                {stepCopy.label}
              </div>
              <div className={styles.qStepCount}>
                {formatTemplate(t.stepOf, { current: stepIndex + 1, total: totalSteps })}
              </div>
            </div>
            <div className={styles.qProgressBar}>
              <div className={styles.qProgressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className={styles.qCard}>
            <h2 className={styles.qStepTitle}>{stepCopy.title}</h2>
            <p className={styles.qStepIntro}>{stepCopy.intro}</p>
            {currentStep.questions.map((q) => renderQuestion(currentStep, q))}
          </div>

          <div className={styles.qNav}>
            <button
              type="button"
              className={styles.qBtnBack}
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              <ArrowLeft size={14} />
              {t.back}
            </button>
            <button
              type="button"
              className={styles.qBtnNext}
              onClick={handleNext}
              disabled={!stepValid}
            >
              {stepIndex === totalSteps - 1 ? t.finish : t.next}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      ) : null}

      {screen === "loading" ? (
        <section className={styles.loadingCard}>
          <div className={styles.loadingIcon}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h2 className={styles.loadingTitle}>{t.loadingTitle}</h2>
          <p className={styles.loadingMsg}>{t.loadingMessages[loadingMsgIndex]}</p>
          <div className={styles.loadingDots}>
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
            <span className={styles.loadingDot} />
          </div>
        </section>
      ) : null}

      {screen === "results" && result ? (
        <section>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsEyebrow}>
              <Check size={11} strokeWidth={2.5} />
              {t.resultsEyebrow}
            </div>
            <h1 className={styles.resultsTitle}>{t.resultsTitle}</h1>
            <p className={styles.resultsSub}>{t.resultsSubtitle}</p>
          </div>

          <div className={styles.profileCard}>
            <div className={styles.profileEyebrow}>
              <Sparkles size={12} />
              {t.profileEyebrow}
            </div>
            <HtmlText html={result.profileSummary} className={styles.profileSummary} />
            <div className={styles.profileTags}>
              {result.profileTags.map((tag) => (
                <span key={tag} className={styles.profileTag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.recsSectionHeader}>
            <div className={styles.recsSectionLabel}>{t.matchesSectionLabel}</div>
            <h2 className={styles.recsSectionTitle}>{t.resultsTitle}</h2>
          </div>

          <div className={styles.recsGrid}>
            {result.recommendations.map((rec) => (
              <article key={rec.slug} className={styles.recCard}>
                <div
                  className={`${styles.recRankLabel} ${rec.rank === 1 ? styles.recRank1 : styles.recRankOther}`}
                >
                  {rec.rank === 1 ? "✦" : rec.rank === 2 ? "✓" : "↗"} {rec.rankLabel}
                </div>
                <div className={styles.recHead}>
                  <div
                    className={`${styles.recIcon} ${rec.rank === 1 ? styles.recIconRank1 : ""}`}
                  >
                    {categoryEmoji(rec.category)}
                  </div>
                  <div>
                    <div className={styles.recCat}>{rec.category}</div>
                    <h3 className={styles.recName}>{rec.title}</h3>
                  </div>
                </div>
                <p className={styles.recHook}>{rec.hook}</p>
                <p className={styles.recDesc}>{rec.description}</p>

                <div className={styles.recSection}>
                  <div className={styles.recSectionLabel}>{t.whyItFits}</div>
                  <ul className={styles.recFits}>
                    {rec.whyItFits.map((reason) => (
                      <li key={reason} className={styles.recFit}>
                        <span className={styles.recFitBullet}>
                          <Check size={10} strokeWidth={3} />
                        </span>
                        <HtmlText html={reason} className={styles.recFitText} />
                      </li>
                    ))}
                  </ul>
                </div>

                {rec.careers.length > 0 ? (
                  <div className={styles.recSection}>
                    <div className={styles.recSectionLabel}>{t.whereItLeads}</div>
                    <div className={styles.recCareersList}>
                      {rec.careers.map((career) => (
                        <div key={career.title} className={styles.recCareerRow}>
                          <span className={styles.recCareerName}>{career.title}</span>
                          {career.signal ? (
                            <span
                              className={`${styles.recCareerSignal} ${
                                career.signal === "high-demand"
                                  ? styles.signalHighDemand
                                  : career.signal === "growing"
                                    ? styles.signalGrowing
                                    : styles.signalHighSalary
                              }`}
                            >
                              {careerSignals[career.signal] ?? career.signal}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {rec.universities.length > 0 ? (
                  <div className={styles.recSection}>
                    <div className={styles.recSectionLabel}>{t.universitiesToExplore}</div>
                    <div className={styles.recUnis}>
                      {rec.universities.map((uni) => (
                        <Link key={uni.href} href={uni.href} className={styles.recUniRow}>
                          <span className={styles.recUniName}>{uni.name}</span>
                          <span className={styles.recUniContext}>{uni.context}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.recActions}>
                  <Link href={rec.href} className={styles.recBtnPrimary}>
                    {formatTemplate(t.exploreProgram, { program: rec.title })}
                    <ArrowRight size={12} />
                  </Link>
                  <Link href="/student/advisor-sessions" className={styles.recBtnSecondary}>
                    {t.talkToAdvisor}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.disclaimer}>
            <MessageSquare size={18} />
            <div>{t.disclaimer}</div>
          </div>

          <div className={styles.bottomCtaHeader}>
            <div className={styles.bottomCtaEyebrow}>{t.nextStepsEyebrow}</div>
            <h2 className={styles.bottomCtaTitle}>{t.nextStepsTitle}</h2>
            <p className={styles.bottomCtaSub}>{t.nextStepsSubtitle}</p>
          </div>

          <div className={styles.bottomCtaGrid}>
            <Link href="/student/advisor-sessions" className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <MessageSquare size={22} />
              </div>
              <div>
                <div className={styles.ctaTitle}>{t.ctaAdvisorTitle}</div>
                <div className={styles.ctaDesc}>{t.ctaAdvisorDesc}</div>
              </div>
              <span className={styles.ctaLink}>
                {t.ctaAdvisorLink} <ArrowRight size={12} />
              </span>
            </Link>
            <Link href="/student/ambassadors" className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <Users size={22} />
              </div>
              <div>
                <div className={styles.ctaTitle}>{t.ctaAmbassadorTitle}</div>
                <div className={styles.ctaDesc}>{t.ctaAmbassadorDesc}</div>
              </div>
              <span className={styles.ctaLink}>
                {t.ctaAmbassadorLink} <ArrowRight size={12} />
              </span>
            </Link>
            <Link href="/student/universities" className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <GraduationCap size={22} />
              </div>
              <div>
                <div className={styles.ctaTitle}>{t.ctaUniversitiesTitle}</div>
                <div className={styles.ctaDesc}>{t.ctaUniversitiesDesc}</div>
              </div>
              <span className={styles.ctaLink}>
                {t.ctaUniversitiesLink} <ArrowRight size={12} />
              </span>
            </Link>
            <Link href="/student/application-support" className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <Sparkles size={22} />
              </div>
              <div>
                <div className={styles.ctaTitle}>{t.ctaApplicationTitle}</div>
                <div className={styles.ctaDesc}>{t.ctaApplicationDesc}</div>
              </div>
              <span className={styles.ctaLink}>
                {t.ctaApplicationLink} <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <button type="button" className={styles.restartBtn} onClick={restart}>
            <RotateCcw size={13} />
            {t.retake}
          </button>
        </section>
      ) : null}
    </div>
  );
}
