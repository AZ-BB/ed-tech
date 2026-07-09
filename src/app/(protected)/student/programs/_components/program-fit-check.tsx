"use client";

import { useMemo, useState } from "react";

import detailStyles from "./program-detail.module.css";

type ProgramFitCheckProps = {
  questions: string[];
  notIdealItems: string[];
  eyebrow: string;
  title: string;
  subtitle: string;
  resultEyebrow: string;
  matchLabel: string;
  resultText: string;
  notIdealLabel: string;
};

export function ProgramFitCheck({
  questions,
  notIdealItems,
  eyebrow,
  title,
  subtitle,
  resultEyebrow,
  matchLabel,
  resultText,
  notIdealLabel,
}: ProgramFitCheckProps) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set([1, 2, 4]));

  const pct = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((checked.size / questions.length) * 100);
  }, [checked, questions.length]);

  const resultTitle =
    pct >= 70 ? "Strong fit" : pct >= 40 ? "Possible fit" : "Worth exploring more";

  const toggle = (index: number) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (questions.length === 0) return null;

  return (
    <section className={detailStyles.section}>
      <div className={detailStyles.sectionEyebrow}>{eyebrow}</div>
      <h2 className={detailStyles.sectionTitle}>{title}</h2>
      <p className={detailStyles.sectionSub}>{subtitle}</p>

      <div className={detailStyles.fitGrid}>
        <div className={detailStyles.fitQuestions}>
          {questions.map((question, index) => {
            const isChecked = checked.has(index);
            return (
              <button
                key={question}
                type="button"
                className={`${detailStyles.fitQRow} ${isChecked ? detailStyles.fitQRowChecked : ""}`}
                onClick={() => toggle(index)}
              >
                <span className={detailStyles.fitCheck} aria-hidden />
                <span className={detailStyles.fitQText}>{question}</span>
              </button>
            );
          })}
        </div>

        <div className={detailStyles.fitResult}>
          <div className={detailStyles.fitResultEyebrow}>{resultEyebrow}</div>
          <div className={detailStyles.fitResultTitle}>{resultTitle}</div>
          <div className={detailStyles.fitMeter}>
            <div className={detailStyles.fitMeterLabel}>
              <span>{matchLabel}</span>
              <span>{pct}%</span>
            </div>
            <div className={detailStyles.fitMeterBar}>
              <div
                className={detailStyles.fitMeterFill}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <p className={detailStyles.fitResultText}>{resultText}</p>
          {notIdealItems.length > 0 ? (
            <>
              <div className={detailStyles.fitNotIdeal}>{notIdealLabel}</div>
              <div className={detailStyles.fitNotList}>
                {notIdealItems.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
