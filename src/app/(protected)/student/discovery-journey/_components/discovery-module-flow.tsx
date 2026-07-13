"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import type {
  DiscoveryQuestion,
  DiscoveryScales,
  ModuleAnswer,
  ModuleResult,
  ScaleId,
} from "@/types/discovery";
import {
  fetchDiscoveryModules,
  fetchModuleResult,
  submitModuleAnswers,
  type DiscoveryModuleListItem,
} from "../_lib/discovery-journey-api";
import { getModuleTheme, scaleFormatLabel } from "../_lib/discovery-journey-theme";
import { DiscoveryModuleResults } from "./discovery-module-results";
import { DiscoveryTestHeader } from "./discovery-top-bar";
import { ModuleIcon } from "./module-icon";
import styles from "./discovery-journey.module.css";

type Screen = "loading" | "notFound" | "intro" | "quiz" | "submitting" | "results";

function isQuestionAnswered(
  question: DiscoveryQuestion,
  answers: Record<string, number | string>,
): boolean {
  const raw = answers[question.item_id];
  return raw !== undefined && raw !== null && raw !== "";
}

function QuestionView({
  question,
  index,
  total,
  answers,
  scales,
  onAnswer,
  t,
}: {
  question: DiscoveryQuestion;
  index: number;
  total: number;
  answers: Record<string, number | string>;
  scales: DiscoveryScales;
  onAnswer: (questionId: string, value: number | string) => void;
  t: { questionOf: string };
}) {
  const selected = answers[question.item_id];
  const qLabel = `QUESTION ${index + 1} OF ${total}`;

  if (question.response_type === "rating_1_5") {
    const scaleOptions = scales[question.scale as ScaleId] ?? [];
    return (
      <>
        <div className={styles.questionNum}>{qLabel}</div>
        <h2 className={styles.questionText}>{question.text}</h2>
        <div className={styles.answerOptions}>
          {scaleOptions.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.answerOption} ${isSelected ? styles.answerOptionSelected : ""}`}
                onClick={() => onAnswer(question.item_id, opt.value)}
              >
                <span className={styles.answerRadio}>
                  <span className={styles.answerRadioDot} />
                </span>
                <span className={styles.answerText}>{opt.label}</span>
                <span className={styles.answerNum}>{opt.value}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (question.response_type === "forced_choice") {
    const options = [
      { key: "A", label: question.optionA.label },
      { key: "B", label: question.optionB.label },
    ];
    return (
      <>
        <div className={styles.questionNum}>{qLabel}</div>
        <h2 className={styles.questionText}>{question.text}</h2>
        <div className={styles.answerOptions}>
          {options.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`${styles.answerOption} ${isSelected ? styles.answerOptionSelected : ""}`}
                onClick={() => onAnswer(question.item_id, opt.key)}
              >
                <span className={styles.answerRadio}>
                  <span className={styles.answerRadioDot} />
                </span>
                <span className={styles.answerText}>{opt.label}</span>
                <span className={styles.answerNum}>{opt.key}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.questionNum}>{qLabel}</div>
      <h2 className={styles.questionText}>{question.text}</h2>
      <div className={styles.answerOptions}>
        {question.options.map((opt, optIndex) => {
          const isSelected = selected === optIndex;
          return (
            <button
              key={opt.label}
              type="button"
              className={`${styles.answerOption} ${isSelected ? styles.answerOptionSelected : ""}`}
              onClick={() => onAnswer(question.item_id, optIndex)}
            >
              <span className={styles.answerRadio}>
                <span className={styles.answerRadioDot} />
              </span>
              <span className={styles.answerText}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function DiscoveryModuleFlow({ moduleId }: { moduleId: string }) {
  const searchParams = useSearchParams();
  const retakeRequested = searchParams.get("retake") === "1";
  const { dict } = useLocale();
  const t = dict.student.discoveryJourney;

  const [screen, setScreen] = useState<Screen>("loading");
  const [module, setModule] = useState<DiscoveryModuleListItem | null>(null);
  const [scales, setScales] = useState<DiscoveryScales>({});
  const [allModules, setAllModules] = useState<DiscoveryModuleListItem[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<ModuleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const theme = getModuleTheme(moduleId);
  const accentStyle = {
    "--m-accent": theme.accent,
    "--m-accent-soft": theme.accentSoft,
  } as React.CSSProperties;

  const load = useCallback(async () => {
    setScreen("loading");
    setError(null);
    try {
      const data = await fetchDiscoveryModules();
      const mod = data.modules.find((m) => m.id === moduleId) ?? null;
      setScales(data.scales);
      setAllModules(data.modules);

      if (!mod) {
        setScreen("notFound");
        return;
      }

      setModule(mod);

      if (mod.completed && !retakeRequested) {
        const existing = await fetchModuleResult(moduleId);
        if (existing?.result) {
          setResult(existing.result);
          const restored: Record<string, number | string> = {};
          for (const a of existing.answers) {
            restored[a.questionId] = a.answer;
          }
          setAnswers(restored);
          setScreen("results");
          return;
        }
      }

      setScreen("intro");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
      setScreen("notFound");
    }
  }, [moduleId, retakeRequested, t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = module?.questions ?? [];
  const currentQuestion = questions[questionIndex];
  const currentValid = currentQuestion ? isQuestionAnswered(currentQuestion, answers) : false;
  const progressPct =
    questions.length > 0 ? ((questionIndex + 1) / questions.length) * 100 : 0;
  const isLastQuestion = questionIndex >= questions.length - 1;

  const nextIncompleteHref = useMemo(() => {
    const startIdx = allModules.findIndex((m) => m.id === moduleId) + 1;
    for (let i = 0; i < allModules.length; i++) {
      const idx = (startIdx + i) % allModules.length;
      const m = allModules[idx];
      if (!m.completed && m.id !== moduleId) {
        return `/student/discovery-journey/${m.id}`;
      }
    }
    return null;
  }, [allModules, moduleId]);

  const setAnswer = useCallback((questionId: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const buildPayload = useCallback((): ModuleAnswer[] => {
    return Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
  }, [answers]);

  const handleSubmit = useCallback(async () => {
    setScreen("submitting");
    setError(null);
    try {
      const payload = buildPayload();
      const scored = await submitModuleAnswers(moduleId, payload);
      setResult(scored);
      setAllModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, completed: true } : m)),
      );
      setScreen("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
      setScreen("quiz");
    }
  }, [buildPayload, moduleId, t.loadError]);

  const handleNext = () => {
    if (!currentValid) return;
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void handleSubmit();
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setScreen("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (screen === "loading" || screen === "submitting") {
    return (
      <div className={styles.testPage} style={accentStyle}>
        <DiscoveryTestHeader backLabel={t.backToJourney} />
        <div className={styles.loadingState}>
          {screen === "submitting" ? t.submitting : t.loading}
        </div>
      </div>
    );
  }

  if (screen === "notFound" || !module) {
    return (
      <div className={styles.testPage} style={accentStyle}>
        <DiscoveryTestHeader backLabel={t.backToJourney} />
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>{error ?? "Module not found"}</h2>
          <Link href="/student/discovery-journey" className={styles.btnPrimary}>
            {t.backToJourney}
          </Link>
        </div>
      </div>
    );
  }

  if (screen === "results" && result) {
    return (
      <div className={styles.resultsPage} style={accentStyle}>
        <DiscoveryTestHeader backLabel={t.backToJourney} />
        <DiscoveryModuleResults
          result={result}
          moduleTitle={module.title}
          onRetake={handleRetake}
          nextModuleHref={nextIncompleteHref}
        />
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className={styles.testPage} style={accentStyle}>
        <DiscoveryTestHeader
          backLabel={t.backToJourney}
          title={`Module ${module.number} · ${module.title}`}
        />

        <div className={styles.testIntro}>
          <div className={styles.testIntroIcon}>
            <ModuleIcon icon={theme.icon} size={30} />
          </div>
          <div className={styles.testIntroEyebrow}>MODULE {module.number}</div>
          <h1 className={styles.testIntroTitle}>{module.title}</h1>
          {module.description ? (
            <p className={styles.testIntroSub}>{module.description}</p>
          ) : null}
          <div className={styles.testIntroMeta}>
            <span className={styles.testIntroMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {theme.timeLabel}
            </span>
            <span className={styles.testIntroMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {module.numItems} {t.questions}
            </span>
            <span className={styles.testIntroMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              {scaleFormatLabel(module.answerFormat)}
            </span>
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setScreen("quiz");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {t.beginModule}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.testPage} style={accentStyle}>
      <DiscoveryTestHeader
        backLabel={t.backToJourney}
        title={`Module ${module.number} · ${module.title}`}
      />

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.testProgressWrap}>
        <div className={styles.testProgressInfo}>
          <span>
            {t.questionOf
              .replace("{current}", String(questionIndex + 1))
              .replace("{total}", String(questions.length))}
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className={styles.testProgressBar}>
          <div
            className={styles.testProgressFill}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className={styles.questionCard}>
        {currentQuestion ? (
          <QuestionView
            question={currentQuestion}
            index={questionIndex}
            total={questions.length}
            answers={answers}
            scales={scales}
            onAnswer={setAnswer}
            t={t}
          />
        ) : null}
      </div>

      <div className={styles.testActions}>
        <button
          type="button"
          className={styles.testActionsSecondary}
          disabled={questionIndex === 0}
          onClick={() => {
            setQuestionIndex((i) => Math.max(0, i - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t.previous}
        </button>
        <div className={styles.testActionsRight}>
          <button
            type="button"
            className={styles.btnFinish}
            disabled={!currentValid}
            onClick={handleNext}
          >
            {isLastQuestion ? t.finishModule : t.next}
            {isLastQuestion ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
